import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { SnotifyToast } from '../../models/snotify-toast.model';

@Component({
  selector: 'ng-snotify-prompt',
  templateUrl: './prompt.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})

/**
 * Prompt component. Part of PROMPT type
 */
export class PromptComponent {
  /**
   * Get PROMPT placeholder
   */
  @Input() toast: SnotifyToast;
  /**
   * Is PROMPT focused
   */
  isPromptFocused = false;

  handleInput($event: Event) {
    this.toast.value = ($event.target as HTMLInputElement).value;
    this.toast.eventEmitter.next('input');
  }
}
