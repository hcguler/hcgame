import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateComponent } from './components/pwa-update/pwa-update.component';
import { PwaService } from './services/pwa.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaUpdateComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'hcgame';

  constructor(private pwaService: PwaService) {}
}
