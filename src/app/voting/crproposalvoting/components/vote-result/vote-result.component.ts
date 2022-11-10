import { Component, Input, OnInit } from '@angular/core';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteResult } from '../../model/proposal-details';

@Component({
    selector: 'vote-result',
    templateUrl: './vote-result.component.html',
    styleUrls: ['./vote-result.component.scss'],
})
export class VoteResultComponent implements OnInit {
    @Input('vote') vote: VoteResult = null;

    constructor(public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) { }

    ngOnInit() { }

    public avatarList = {
        "Sunnyfenghan": "https://api.elastos.io/images/SunnyFengHan.png",
        "Donald Bullers": "https://api.elastos.io/images/DonaldBullers.png",
        "Elation Studios": "https://api.elastos.io/images/ElationStudios.png",
        "Mark Xing": "https://api.elastos.io/images/MarkXing.png",
        "Brittany Kaiser": "https://api.elastos.io/images/BrittanyKaiser.png",
        "Ryan | Starfish Labs": "https://api.elastos.io/images/Starfish.png",
        "SJun Song": "https://api.elastos.io/images/SjunSong.png",
        "Rebecca Zhu": "https://api.elastos.io/images/RebeccaZhu.png",
        "The Strawberry Council": "https://api.elastos.io/images/TheStrawberryCouncil.png",
        "Zhang Feng": "https://api.elastos.io/images/ZhangFeng.png",
        "Jingyu Niu": "https://api.elastos.io/images/NiuJingyu.png",
        "Orchard Trinity": "https://api.elastos.io/images/Orchard.png",
    }

    public didList = {
        "Sunnyfenghan": "ioNZHmG9CpDvjEfpRNWU1vd8i1rSHzVGB2",
        "Donald Bullers": "iqHaEoHQNdsRBFHNXEoiwF8hMRAikgMuxS",
        "Elation Studios": "if4ApisvFmMQTsBBeibYj8RYY8T6zKU5v5",
        "Mark Xing": "idzud676zaw6hbSbvkfzKnZgWdK9Pj3w8T",
        "Brittany Kaiser": "ipLeeiAP46JHN12sXAAr22oowHJ23x9FRM",
        "Ryan | Starfish Labs": "iaBNozEmoTkzeEAjrUJyZDtuX8HJHBhYtx",
        "SJun Song": "ifFGHBuoAbT4Hk6uHn8vsQn5et7KExyMUZ",
        "Rebecca Zhu": "icaVPz8nY7Y7LKjpJxmzWxCG5F3CEV6hnt",
        "The Strawberry Council": "ioe6q6iXHvMEmdBEB4wpd1WGyrgEuttw93",
        "Zhang Feng": "ianpxAxfvEwX2VrScpHgtBiUsSu2wcxj4B",
        "Jingyu Niu": "iXMsb6ippqkCHN3EeWc4QCA9ySnrSgLc4u",
        "Orchard Trinity": "iTN9V9kaBewdNE9aw7DfqHgRn6NcDj8HCf",
    }

    onShowMemberInfo(name: string) {
        let did = this.didList[name];
        if (did) {
            void this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, '/crcouncilvoting/crmember/' + did);
        }
    }
}
