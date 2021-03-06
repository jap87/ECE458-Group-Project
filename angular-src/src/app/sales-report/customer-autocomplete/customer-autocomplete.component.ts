import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SalesReportService } from '../sales-report.service';

@Component({
  selector: 'app-customer-autocomplete',
  templateUrl: './customer-autocomplete.component.html',
  styleUrls: ['./customer-autocomplete.component.css']
})
export class CustomerAutocompleteComponent implements OnInit {

  suggestedCustomers: string[];
  inputField : FormControl = new FormControl();

  @Input() initCustomer : string;
  @Output() messageEvent = new EventEmitter<any>();

  constructor(public salesReportService: SalesReportService) { }

  ngOnInit() {
    this.inputField.setValue(this.initCustomer);
    this.inputField.valueChanges.debounceTime(200)
   .distinctUntilChanged()
   .switchMap((query) =>  this.salesReportService.autocompleteCustomers({input: query}))
   .subscribe( result => {
          if(result!=null && result.data!=null){
            this.suggestedCustomers = ["all"];
            for(let customer of result.data){
              this.suggestedCustomers.push(customer.name)
          }
         }
    });
  }

  onSelectionChanged(ev) {
    this.messageEvent.emit(ev.option.value);
  }

  onBlur() {
    
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }

  displayFn(customer: string): string | undefined {
    return customer;
  }
}
