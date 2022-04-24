import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Candidate } from '../../model/candidates.model';
import { CRCouncilService } from '../../services/crcouncil.service';

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

  constructor(public crCouncilService: CRCouncilService, public theme: GlobalThemeService) { }

  ngOnInit() {
    this.displayedCandidates = this.crCouncilService.candidates.slice(0, this.candidateIndex + 2);
    this.slideOpts.initialSlide = this.displayedCandidates.indexOf(this.candidate);
  }

  // Increment candidates array when sliding forward //
  loadNext() {
    // Find last candidate in displayed slides
    let lastCandidate: Candidate = this.displayedCandidates.slice(-1)[0];
    // Use last candidate to find next candidate
    let nextCandidateIndex: number = this.crCouncilService.candidates.indexOf(lastCandidate) + 1;
    // If next candidate exists, push it to slide array
    if(this.crCouncilService.candidates[nextCandidateIndex]) {
      this.displayedCandidates.push(this.crCouncilService.candidates[nextCandidateIndex]);
    } else {
      return;
    }
    Logger.log('crcouncil', 'last Candidate', lastCandidate);
    Logger.log('crcouncil', 'next Candidate', this.crCouncilService.candidates[nextCandidateIndex]);
  }

  getVotePercent(votes: string): string {
    const votePercent: number = parseFloat(votes) / this.crCouncilService.totalVotes * 100;
    return votePercent.toFixed(2);
  }
}
