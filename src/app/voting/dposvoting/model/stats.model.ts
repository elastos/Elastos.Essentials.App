export class Mainchain {
  constructor(
    public txperhr7d: number,
    public activeaddresses7d: number,
    public txperhr: number,
    public activeaddresses: number,
  ) {}
}

export class Voters {
  constructor(
    public total7d: number,
    public ELA7d: string,
    public percent7d: string,
    public total: number,
    public ELA: string,
    public percent: string
  ) {}
}

export class Price {
  constructor(
    public bitcoin: string,
    public circ_supply: string,
    public total_supply: string,
    public rank: number,
    public usd: string,
    public btc: string,
    public day: string,
    public week: string,
    public cap: string,
    public volume: string
  ) {}
}

export class Block {
  constructor(
    public height: number,
    public validator: string,
    public percentBTChashrate: string
  ) {}
}
