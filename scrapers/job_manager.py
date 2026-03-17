"""
Controls the scraper_jobs table row for this run.
Handles pause/resume by blocking in a polling loop when signal = 'pause'.
Supports adopting a 'pending' job created by the UI.
"""

import time
import sys
from supabase_client import get_client

POLL_INTERVAL = 5  # seconds between signal checks while paused


class JobManager:
    def __init__(self, run_id: str, trigger: str, feeds_total: int,
                 focus_topic: str | None = None, focus_geography: str | None = None,
                 focus_type: str | None = None):
        self.db = get_client()
        self.run_id = run_id
        self.job_id: str | None = None
        self.focus_topic = focus_topic
        self.focus_geography = focus_geography
        self.focus_type = focus_type or 'all'
        self._create(trigger, feeds_total)

    @classmethod
    def adopt_pending(cls, run_id: str) -> 'JobManager | None':
        """
        Look for the most recent 'pending' job in the DB.
        If found, claim it (set status=running) and return a pre-populated JobManager.
        Returns None if no pending job exists.
        """
        db = get_client()
        res = (
            db.table('scraper_jobs')
            .select('id, focus_topic, focus_geography, focus_type')
            .eq('status', 'pending')
            .order('created_at', desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None

        row = res.data[0]
        print(f'[job] adopting pending job {row["id"]}', flush=True)

        db.table('scraper_jobs').update({
            'run_id':  run_id,
            'status':  'running',
            'signal':  'run',
        }).eq('id', row['id']).execute()

        # Build a minimal JobManager without calling _create
        instance = object.__new__(cls)
        instance.db = db
        instance.run_id = run_id
        instance.job_id = row['id']
        instance.focus_topic = row.get('focus_topic')
        instance.focus_geography = row.get('focus_geography')
        instance.focus_type = row.get('focus_type') or 'all'
        return instance

    def _create(self, trigger: str, feeds_total: int) -> None:
        res = self.db.table('scraper_jobs').insert({
            'run_id':           self.run_id,
            'trigger':          trigger,
            'status':           'running',
            'signal':           'run',
            'feeds_total':      feeds_total,
            'focus_topic':      self.focus_topic,
            'focus_geography':  self.focus_geography,
            'focus_type':       self.focus_type,
        }).execute()
        self.job_id = res.data[0]['id']
        print(f'[job] created {self.job_id} ({self.run_id})', flush=True)

    def update(self, **kwargs) -> None:
        self.db.table('scraper_jobs').update(kwargs).eq('id', self.job_id).execute()

    def set_feeds_total(self, total: int) -> None:
        self.update(feeds_total=total)

    def check_signal(self) -> str:
        """
        Returns 'run' or 'stop'.
        If signal is 'pause', blocks here until the signal changes.
        """
        res = (
            self.db.table('scraper_jobs')
            .select('signal')
            .eq('id', self.job_id)
            .single()
            .execute()
        )
        signal = res.data['signal']

        if signal == 'pause':
            print('[job] paused — waiting for resume signal...', flush=True)
            self.update(status='paused', paused_at='now()')

            while signal == 'pause':
                time.sleep(POLL_INTERVAL)
                res = (
                    self.db.table('scraper_jobs')
                    .select('signal')
                    .eq('id', self.job_id)
                    .single()
                    .execute()
                )
                signal = res.data['signal']

            print(f'[job] resumed with signal={signal}', flush=True)
            self.update(status='running', paused_at=None)

        return signal  # 'run' or 'stop'

    def progress(self, feeds_done: int, current_feed: str,
                 articles_fetched: int, articles_new: int) -> None:
        self.update(
            feeds_done=feeds_done,
            current_feed=current_feed,
            articles_fetched=articles_fetched,
            articles_new=articles_new,
        )

    def complete(self, articles_fetched: int, articles_new: int) -> None:
        self.update(
            status='completed',
            signal='run',
            articles_fetched=articles_fetched,
            articles_new=articles_new,
            completed_at='now()',
            current_feed=None,
        )
        print(f'[job] completed — fetched={articles_fetched} new={articles_new}', flush=True)

    def stop(self) -> None:
        self.update(status='stopped', completed_at='now()', current_feed=None)
        print('[job] stopped by signal', flush=True)

    def fail(self, error: str) -> None:
        self.update(status='failed', error_message=error[:500], current_feed=None)
        print(f'[job] failed: {error}', flush=True)
