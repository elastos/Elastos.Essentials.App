import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

/*
* TODO @chad: do we still need those theme + lang getters/setters? Why don't we just use preferences here?
*/
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(private storage: Storage) {
  }

  /*** Dark Mode ***/
  public setTheme(value: boolean) {
    return this.storage.set("theme", JSON.stringify(value)).then((data) => {
      console.log('Saved theme', data);
    });
  }

  public getTheme(): Promise<boolean> {
    return this.storage.get("theme").then((data) => {
      console.log('Fetched theme', data);
      return JSON.parse(data);
    });
  }

  public setLang(value: string) {
    this.storage.set("selectLang", JSON.stringify(value)).then((data) => {
      console.log('Saved language', data);
    });
  }

  public getLang(): Promise<string> {
    return this.storage.get("selectLang").then(data => {
      console.log('Fetched language', data);
      return JSON.parse(data);
    });
  }

}
