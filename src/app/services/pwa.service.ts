import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  isOnline$ = this.isOnlineSubject.asObservable();

  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  updateAvailable$ = this.updateAvailableSubject.asObservable();

  constructor(private swUpdate: SwUpdate) {
    // Check for service worker updates
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map(evt => {
            console.log(`Current version: ${evt.currentVersion.hash}`);
            console.log(`New version: ${evt.latestVersion.hash}`);
            return true;
          })
        )
        .subscribe(value => {
          this.updateAvailableSubject.next(value);
        });
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
    });
  }

  /**
   * Check for service worker updates
   */
  checkForUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate()
        .then(() => console.log('Checking for updates...'))
        .catch(err => console.error('Error checking for updates:', err));
    }
  }

  /**
   * Update the application with the latest version
   */
  updateApplication(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return Promise.resolve(false);
    }

    return this.swUpdate.activateUpdate()
      .then(() => {
        window.location.reload();
        return true;
      })
      .catch(err => {
        console.error('Error updating application:', err);
        return false;
      });
  }
}
