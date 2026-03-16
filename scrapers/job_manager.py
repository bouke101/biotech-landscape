"""
Controls the scraper_jobs table row for this run.
Handles pause/resume by blocking in a polling loop when signal = 'pause'.
"""

import time
import sys
from supabase_client import get_client

POLL_INTERVAL = 5  # seconds between signal checks while paused


class JobManager:
    def __init__(self, run_id: str, trigger: str, feeds_total: int):
        self.db = get_client()
        self.run_id = run_id
        self.job_id: str | None = None
        self._create(trigger, feeds_total)

    def _create(self, trigger: str, feeds_total: int) -> None:
        res = self.db.table('scraper_jobs').insert({
            'run_id': self.run_id,
            'trigger': trigger,
            'status': 'running',
            'signal': 'run',
            'feeds_total': feeds_total,
        }).execute()
        self.job_id = res.data[0]['id']
        print(f'[job] created {self.job_id} ({self.run_id})', flush=True)

    def update(self, **kwargs) -> None:
        self.db.table('scraper_jobs').update(kwargs).eq('id', self.job_id).execute()

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
