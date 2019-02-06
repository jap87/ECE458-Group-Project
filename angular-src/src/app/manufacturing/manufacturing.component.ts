import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service'
import { ManufacturingService, RefreshResponse } from './manufacturing.service';

@Component({
  selector: 'app-manufacturing',
  templateUrl: './manufacturing.component.html',
  styleUrls: ['./manufacturing.component.css']
})
export class ManufacturingComponent implements OnInit {

  manufGoalList: Array<any> = [];
  currentPage: number;
  maxPages: number;

  constructor(private authenticationService: AuthenticationService, public manufacturingService: ManufacturingService) { }

  ngOnInit() {
    this.currentPage = 1;
    this.refresh();
  }

  refresh() {
      this.manufacturingService.refresh({
          sortBy : "name",
          pageNum: this.currentPage,
          user : this.authenticationService.loginState.user
        }).subscribe(
        response => this.handleRefreshResponse(response),
        err => {
          if (err.status === 401) {
            console.log("401 Error")
          }
        }
      );
  }

  exportcsv(id) {
    var csvContent = "data:text/csv;charset=utf-8,";
    csvContent += ["sku_name", "case_quantity"].join(",") + "\r\n";
    this.manufGoalList[id].skus.forEach(function(item) {
      //let row = item.number+","+item.name+","+item.package_size+","+item.cost+","+item.calculated_quantity;
      //csvContent += row + "\r\n";
      console.log(item);
      csvContent += item.sku_name+","+item.case_quantity+"\r\n";
    });
    var encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  handleRefreshResponse(response: RefreshResponse){
    console.log(response);
    if(response.success){
      this.manufGoalList = [];
      for(let manufGoal of response.data){
        this.manufGoalList.push({
            name: manufGoal.name,
            skus: manufGoal.skus
        });
      }
      this.maxPages = response.pages;
    }
  }

  nextPage(){
    if(this.currentPage<this.maxPages){
      this.currentPage++;
      this.refresh();
    }
  }

  prevPage(){
    if(this.currentPage>1){
      this.currentPage--;
      this.refresh();
    }
  }

  setPage(i){
    this.currentPage = i;
    this.refresh();
  }

  showAll(){
    this.currentPage = -1;
  }

  shownPages(){
    var numbers : Array<number> = [];
    if(this.maxPages>5)
    {
      for (var i = 1; i < 5; i++) {
        numbers.push(i);
      }
      numbers.push(this.maxPages)
      return numbers;
    }
    else{
      for (var i = 1; i <= this.maxPages; i++) {
        numbers.push(i);
      }
      return numbers;
    }
  }

}