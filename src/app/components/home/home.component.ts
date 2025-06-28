import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  title = 'HCGame';
  menuItems = [
    { name: 'Practices', route: '/practices' },
    { name: 'Challenge', route: '/challenge' },
    { name: 'Online', route: '/online' },
    { name: 'Leaderboard', route: '/leaderboard' },
    { name: 'How to Play', route: '/how-to-play' },
    { name: 'Contact', route: '/contact' }
  ];
}
