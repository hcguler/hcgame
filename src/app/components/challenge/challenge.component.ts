import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

interface Challenge {
  id: number;
  difficulty: number; // 1-5 representing difficulty level
  completed: boolean;
  stars: number; // 0-3 stars based on performance
}

@Component({
  selector: 'app-challenge',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf],
  templateUrl: './challenge.component.html',
  styleUrls: ['./challenge.component.scss']
})
export class ChallengeComponent {
  title = 'Challenge';

  // Create an array of 30 challenges (6 rows x 5 columns)
  challenges: Challenge[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    difficulty: Math.ceil((i + 1) / 6), // Increase difficulty every 6 challenges
    completed: Math.random() > 0.7, // Randomly set some as completed for demonstration
    stars: Math.random() > 0.7 ? 3 : 0 // Either 3 stars or 0 stars for demonstration
  }));

  // Get challenges for a specific row
  getChallengesForRow(row: number): Challenge[] {
    const startIndex = row * 5;
    return this.challenges.slice(startIndex, startIndex + 5);
  }

  // Get array of 6 rows
  get rows(): number[] {
    return Array.from({ length: 6 }, (_, i) => i);
  }
}
