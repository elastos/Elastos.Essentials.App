export class BaseEarnSwapProvider {
  constructor(
    public logo: string, // Path to a local logo for this provider. Approx 200x200
    public name: string, // User friendly name - ex: FilDA
    public projectUrl: string // Root project url - ex: filda.io
  ) { }
}