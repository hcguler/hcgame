import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-pwa-update',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-update.component.html',
  styleUrls: ['./pwa-update.component.scss']
})
export class PwaUpdateComponent implements OnInit {
  isOnline$ = this.pwaService.isOnline$;
  updateAvailable$ = this.pwaService.updateAvailable$;

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    // Check for updates when the component initializes
    this.pwaService.checkForUpdates();
  }

  updateApp(): void {
    this.pwaService.updateApplication();
  }
}
