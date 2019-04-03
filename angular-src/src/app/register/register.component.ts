import { Component, OnInit } from '@angular/core';
import { AccountsService } from '../accounts.service';
import { AuthenticationService } from '../authentication.service';
import { CrudManufacturingLineService } from '../manufacturing-line-table/crud-manufacturing-line.service';
import { MatSnackBar } from '@angular/material';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
	newAdminSelection = false;
	adminSelection = false;
	userInput: string;
  adminPriveleges: string[] = ['Analyst', 'Product Manager', 'Business Manager', 'Plant Manager', 'Administrator'];
  selectedOptions: string[] = ['Analyst'];
  manufacturingLines = [];

	constructor(private authenticationService: AuthenticationService, private crudManufacturingLineService: CrudManufacturingLineService, private accountsService: AccountsService, private snackBar: MatSnackBar) { }

	ngOnInit() {
    this.crudManufacturingLineService.read({
        pageNum: -1,
        page_size: 0,
        sortBy: "name"
      }).subscribe(
      response => {
        for(let manufacturingLine of response.data){
          this.manufacturingLines.push(manufacturingLine.shortname);
        }
      },
      err => {
        if (err.status === 401) {
          console.log("401 Error")
        }
      }
    );
  }

	register(name: string, email: string, password: string, password2: string) {
		this.accountsService.register(name, email, password, password2, this.newAdminSelection).subscribe((response) => {
				this.snackBar.open(response.message, 'close', {duration:3000});
		}, (err) => {
			this.snackBar.open(err, 'close', {duration:3000});
		});
	}

	updatePriveleges() {
    var admin = this.selectedOptions.indexOf('Administrator')>-1;
		this.accountsService.updatePriveleges(this.userInput, admin).subscribe((response) => {
				this.snackBar.open(response.message, 'close', {duration:3000});
		}, (err) => {
			this.snackBar.open(err, 'close', {duration:3000});
		});
	}

	deleteUser() {
		this.accountsService.deleteUser(this.userInput).subscribe((response) => {
			this.snackBar.open(response.message, 'close', {duration:3000});
	}, (err) => {
		this.snackBar.open(err, 'close', {duration:3000});
	});
	}

  isAdmin(){
    return this.authenticationService.isAdmin();
  }

  updateUser(ev){
    this.userInput = ev;
  }

  handleClick(ev){
    ev.stopPropagation();
  }

}
