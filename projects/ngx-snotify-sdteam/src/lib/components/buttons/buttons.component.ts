import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import { SnotifyService } from '../../services/snotify.service';
import { SnotifyToast } from '../../models/snotify-toast.model';

@Component({
  selector: 'ng-snotify-button',
  templateUrl: './buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})

/**
 * Buttons component
 */
export class ButtonsComponent implements AfterViewInit {
  /**
   * Get buttons Array
   */
  @Input() toast: SnotifyToast;
  @ViewChildren('btn') buttons: QueryList<ElementRef>;

  constructor(private service: SnotifyService) { }

  ngAfterViewInit() {
    this.toast.config.buttons.forEach((button, index) => {
      if (button.focus) {
        setTimeout(() => {
          this.buttons.toArray()[index].nativeElement.focus();
        }, 0);
      }
    });
  }

  /**
   * remove toast
   */
  remove() {
    this.service.remove(this.toast.id);
  }
}
