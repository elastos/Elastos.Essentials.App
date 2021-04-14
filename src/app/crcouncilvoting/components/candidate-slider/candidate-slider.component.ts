import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { Candidate } from '../../model/candidates.model';
import { CandidatesService } from '../../services/candidates.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-candidate-slider',
  templateUrl: './candidate-slider.component.html',
  styleUrls: ['./candidate-slider.component.scss'],
})
export class CandidateSliderComponent implements OnInit {

  @ViewChild('slider', {static: false}) slider: IonSlides;

  @Input() candidate: Candidate;
  @Input() candidateIndex: number;

  public displayedCandidates: Candidate[] = [];

  slideOpts = {
    initialSlide: 1,
    speed: 400,
    centeredSlides: true,
    slidesPerView: 1.2
  };

  constructor(public candidatesService: CandidatesService, public theme: GlobalThemeService) { }

  ngOnInit() {
    this.displayedCandidates = this.candidatesService.candidates.slice(0, this.candidateIndex + 2);
    this.slideOpts.initialSlide = this.displayedCandidates.indexOf(this.candidate);
  }

  // Increment candidates array when sliding forward //
  loadNext() {
    // Find last candidate in displayed slides
    let lastCandidate: Candidate = this.displayedCandidates.slice(-1)[0];
    // Use last candidate to find next candidate
    let nextCandidateIndex: number = this.candidatesService.candidates.indexOf(lastCandidate) + 1;
    // If next candidate exists, push it to slide array
    if(this.candidatesService.candidates[nextCandidateIndex]) {
      this.displayedCandidates.push(this.candidatesService.candidates[nextCandidateIndex]);
    } else {
      return;
    }
    Logger.log('crcouncil', 'last Candidate', lastCandidate);
    Logger.log('crcouncil', 'next Candidate', this.candidatesService.candidates[nextCandidateIndex]);
  }

  getVotePercent(votes: string): string {
    const votePercent: number = parseFloat(votes) / this.candidatesService.totalVotes * 100;
    return votePercent.toFixed(2);
  }
}
