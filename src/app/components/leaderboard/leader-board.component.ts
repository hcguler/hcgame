import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  level: number;
  completedChallenges: number;
}

@Component({
  selector: 'app-how-to-play',
  standalone: true,
  imports: [RouterLink, NgFor],
  templateUrl: './leader-board.component.html',
  styleUrls: ['./leader-board.component.scss']
})
export class LeaderBoardComponent {
  title = 'Leader Board';

  // Mock data for daily leaderboard
  dailyLeaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    username: `Player${i + 1}_Daily`,
    score: Math.floor(Math.random() * 5000) + 1000,
    level: Math.floor(Math.random() * 20) + 1,
    completedChallenges: Math.floor(Math.random() * 30) + 1
  })).sort((a, b) => b.score - a.score);

  // Mock data for monthly leaderboard
  monthlyLeaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    username: `Player${i + 1}_Monthly`,
    score: Math.floor(Math.random() * 20000) + 5000,
    level: Math.floor(Math.random() * 50) + 10,
    completedChallenges: Math.floor(Math.random() * 100) + 20
  })).sort((a, b) => b.score - a.score);

  // Mock data for all-time leaderboard
  allTimeLeaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    username: `Player${i + 1}_AllTime`,
    score: Math.floor(Math.random() * 100000) + 20000,
    level: Math.floor(Math.random() * 100) + 30,
    completedChallenges: Math.floor(Math.random() * 300) + 50
  })).sort((a, b) => b.score - a.score);
}
