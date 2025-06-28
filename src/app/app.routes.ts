import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {HowToPlayComponent} from './components/how-to-play/how-to-play.component';
import {AboutUsComponent} from './components/about-us/about-us.component';
import {ContactComponent} from './components/contact/contact.component';
import {PracticesComponent} from './components/practices/practices.component';
import {ChallengeComponent} from './components/challenge/challenge.component';
import {OnlineComponent} from './components/online/online.component';
import {LeaderBoardComponent} from "./components/leaderboard/leader-board.component";

export const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: 'practices', component: PracticesComponent},
  {path: 'challenge', component: ChallengeComponent},
  {path: 'online', component: OnlineComponent},
  {path: 'leaderboard', component: LeaderBoardComponent},
  {path: 'how-to-play', component: HowToPlayComponent},
  {path: 'about-us', component: AboutUsComponent},
  {path: 'contact', component: ContactComponent},
  {path: '**', redirectTo: ''}
];
