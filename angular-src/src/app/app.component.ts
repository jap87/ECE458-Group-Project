import { Component, OnInit } from '@angular/core';
import { LoginState } from './model/loginstate';
import { AuthenticationService } from './authentication.service';
import { Router } from '@angular/router';
import { Title }     from '@angular/platform-browser';
import 'hammerjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit{
	constructor (public authService: AuthenticationService, private router: Router, private titleService: Title) { }
	title = 'Hypo®Mea3s';

  ngOnInit() {
    this.titleService.setTitle(this.title);
  }

  isAnalyst() {
    return this.authService.isAnalyst();
  }

  isProductManager() {
    return this.authService.isProductManager();
  }

  isBusinessManager() {
    return this.authService.isBusinessManager();
  }

  isPlantManager() {
    return this.authService.isPlantManager();
  }

  isAdmin() {
    return this.authService.isAdmin();
  }
}
