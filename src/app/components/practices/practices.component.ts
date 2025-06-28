import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval, Subscription, BehaviorSubject } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

interface Operation {
  firstNumber: number;
  secondNumber: number;
  operator: string;
  result: number;
}

@Component({
  selector: 'app-practices',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './practices.component.html',
  styleUrls: ['./practices.component.scss']
})
export class PracticesComponent implements OnInit, OnDestroy {
  title = 'Number Target Game';

  // Game constants
  private readonly bigNumbers = [15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];
  readonly maxOperations = 5;
  private readonly gameTime = 90; // seconds

  // Game state
  targetNumber = 0;
  availableNumbers: number[] = [];
  initialAvailableNumbers: number[] = []; // Store initial numbers for reset
  allNumbers: { value: number, used: boolean }[] = []; // Track all numbers and their state
  initialNumbers: { value: number, used: boolean }[] = []; // Initial 6 numbers
  resultNumbers: { value: number, used: boolean }[] = []; // Operation results
  operations: Operation[] = [];
  selectedNumbers: number[] = [];
  selectedOperator: string | null = null;
  timeLeft = this.gameTime;
  isGameOver = false;
  showSuccessDialog = false;

  // RxJS
  private timerSubscription: Subscription | null = null;
  private gameActive = new BehaviorSubject<boolean>(false);

  ngOnInit(): void {
    this.initGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  initGame(): void {
    // Reset game state
    this.targetNumber = this.generateTargetNumber();
    this.availableNumbers = this.generateAvailableNumbers();
    this.initialAvailableNumbers = [...this.availableNumbers]; // Store initial numbers

    // Initialize allNumbers with initial numbers, all marked as unused
    this.allNumbers = this.initialAvailableNumbers.map(value => ({ value, used: false }));

    // Initialize initialNumbers and resultNumbers
    this.initialNumbers = this.initialAvailableNumbers.map(value => ({ value, used: false }));
    this.resultNumbers = [];

    this.operations = [];
    this.selectedNumbers = [];
    this.selectedOperator = null;
    this.timeLeft = this.gameTime;
    this.isGameOver = false;
    this.showSuccessDialog = false;

    // Start timer
    this.startTimer();
  }

  private generateTargetNumber(): number {
    return Math.floor(Math.random() * 900) + 100; // 100-999
  }

  private generateAvailableNumbers(): number[] {
    const smallNumbers: number[] = [];

    // Generate 5 random small numbers (1-9)
    while (smallNumbers.length < 5) {
      const num = Math.floor(Math.random() * 9) + 1;
      if (!smallNumbers.includes(num)) {
        smallNumbers.push(num);
      }
    }

    // Select 1 random big number
    const bigNumber = this.bigNumbers[Math.floor(Math.random() * this.bigNumbers.length)];

    return [...smallNumbers, bigNumber];
  }

  private startTimer(): void {
    this.stopTimer(); // Stop any existing timer
    this.gameActive.next(true);

    this.timerSubscription = interval(1000)
      .pipe(takeWhile(() => this.gameActive.value))
      .subscribe(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          this.endGame();
        }
      });
  }

  private stopTimer(): void {
    this.gameActive.next(false);
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private endGame(): void {
    this.stopTimer();
    this.isGameOver = true;
  }

  selectNumber(number: number, index: number): void {
    // Only check if we already have 2 selected numbers, allow selecting even when game is over
    if (this.selectedNumbers.length >= 2) return;

    // Determine if this is an initial number or a result number
    if (index < this.initialNumbers.length) {
      // This is an initial number
      if (!this.initialNumbers[index].used) {
        this.initialNumbers[index].used = true;
        this.selectedNumbers.push(number);

        // Also update allNumbers for consistency
        const allNumbersIndex = this.allNumbers.findIndex(n => n.value === number && !n.used);
        if (allNumbersIndex !== -1) {
          this.allNumbers[allNumbersIndex].used = true;
        }

        // Also update availableNumbers for backward compatibility
        const availableIndex = this.availableNumbers.indexOf(number);
        if (availableIndex !== -1) {
          this.availableNumbers.splice(availableIndex, 1);
        }
      }
    } else {
      // This is a result number
      const resultIndex = index - this.initialNumbers.length;
      if (resultIndex >= 0 && resultIndex < this.resultNumbers.length && !this.resultNumbers[resultIndex].used) {
        this.resultNumbers[resultIndex].used = true;
        this.selectedNumbers.push(number);

        // Also update allNumbers for consistency
        const allNumbersIndex = this.allNumbers.findIndex(n => n.value === number && !n.used);
        if (allNumbersIndex !== -1) {
          this.allNumbers[allNumbersIndex].used = true;
        }

        // Also update availableNumbers for backward compatibility
        const availableIndex = this.availableNumbers.indexOf(number);
        if (availableIndex !== -1) {
          this.availableNumbers.splice(availableIndex, 1);
        }
      }
    }

    // If game was over due to max operations, allow continuing
    if (this.isGameOver && this.timeLeft > 0 && !this.showSuccessDialog) {
      this.isGameOver = false;
      this.startTimer();
    }
  }

  selectOperator(operator: string): void {
    // Only check if we have exactly 2 selected numbers, allow operations even when game is over
    if (this.selectedNumbers.length !== 2) return;

    this.selectedOperator = operator;
    this.performOperation();
  }

  private performOperation(): void {
    if (!this.selectedOperator || this.selectedNumbers.length !== 2) return;

    const firstNumber = this.selectedNumbers[0];
    const secondNumber = this.selectedNumbers[1];
    let result = 0;

    switch (this.selectedOperator) {
      case '+':
        result = firstNumber + secondNumber;
        break;
      case '-':
        result = firstNumber - secondNumber;
        break;
      case '×':
        result = firstNumber * secondNumber;
        break;
      case '÷':
        // Check for division by zero or non-integer result
        if (secondNumber === 0 || firstNumber % secondNumber !== 0) {
          // Reset selection if invalid operation
          this.resetSelection();
          return;
        }
        result = firstNumber / secondNumber;
        break;
    }

    // Add operation to history
    const operation: Operation = {
      firstNumber,
      secondNumber,
      operator: this.selectedOperator,
      result
    };

    this.operations.push(operation);

    // Add result to available numbers, allNumbers, and resultNumbers
    this.availableNumbers.push(result);
    this.allNumbers.push({ value: result, used: false });
    this.resultNumbers.push({ value: result, used: false });

    // Check if target reached
    if (result === this.targetNumber) {
      this.showSuccessDialog = true;
      this.stopTimer();
    }

    // Check if max operations reached
    if (this.operations.length >= this.maxOperations) {
      this.endGame();
    }

    // Reset selection
    this.resetSelection();
  }

  private resetSelection(): void {
    this.selectedNumbers = [];
    this.selectedOperator = null;
  }

  undoLastOperation(): void {
    // If there are operations to undo
    if (this.operations.length > 0) {
      const lastOperation = this.operations.pop();
      if (lastOperation) {
        // Remove the result from allNumbers
        const resultIndex = this.allNumbers.findIndex(n => n.value === lastOperation.result);
        if (resultIndex !== -1) {
          this.allNumbers.splice(resultIndex, 1);
        }

        // Remove the result from resultNumbers
        const resultNumberIndex = this.resultNumbers.findIndex(n => n.value === lastOperation.result);
        if (resultNumberIndex !== -1) {
          this.resultNumbers.splice(resultNumberIndex, 1);
        }

        // Mark the original numbers as unused
        // For initialNumbers
        const firstInitialIndex = this.initialNumbers.findIndex(n => n.value === lastOperation.firstNumber);
        if (firstInitialIndex !== -1) {
          this.initialNumbers[firstInitialIndex].used = false;
        }

        const secondInitialIndex = this.initialNumbers.findIndex(n => n.value === lastOperation.secondNumber);
        if (secondInitialIndex !== -1) {
          this.initialNumbers[secondInitialIndex].used = false;
        }

        // For resultNumbers
        const firstResultIndex = this.resultNumbers.findIndex(n => n.value === lastOperation.firstNumber);
        if (firstResultIndex !== -1) {
          this.resultNumbers[firstResultIndex].used = false;
        }

        const secondResultIndex = this.resultNumbers.findIndex(n => n.value === lastOperation.secondNumber);
        if (secondResultIndex !== -1) {
          this.resultNumbers[secondResultIndex].used = false;
        }

        // Also update allNumbers for consistency
        const firstNumberObj = this.allNumbers.find(n => n.value === lastOperation.firstNumber);
        const secondNumberObj = this.allNumbers.find(n => n.value === lastOperation.secondNumber);

        if (firstNumberObj) firstNumberObj.used = false;
        if (secondNumberObj) secondNumberObj.used = false;

        // Also update availableNumbers for backward compatibility
        const availableResultIndex = this.availableNumbers.indexOf(lastOperation.result);
        if (availableResultIndex !== -1) {
          this.availableNumbers.splice(availableResultIndex, 1);
        }
        this.availableNumbers.push(lastOperation.firstNumber);
        this.availableNumbers.push(lastOperation.secondNumber);

        // Reset selection
        this.resetSelection();
      }
    }
    // If there are selected numbers but no operation yet
    else if (this.selectedNumbers.length > 0) {
      // If two numbers are selected, remove the last one
      if (this.selectedNumbers.length === 2) {
        const numberToUndo = this.selectedNumbers.pop();
        if (numberToUndo != null) {
          this.makeNumberSelectable(numberToUndo);
        }
      }
      // If one number is selected, remove it
      else if (this.selectedNumbers.length === 1) {
        const numberToUndo = this.selectedNumbers.pop();
        if (numberToUndo != null) {
          this.makeNumberSelectable(numberToUndo);
        }
      }
    }

    // If game was over due to max operations, allow continuing
    if (this.isGameOver && this.timeLeft > 0 && !this.showSuccessDialog) {
      this.isGameOver = false;
      this.startTimer();
    }
  }

  // Helper method to make a number selectable again
  private makeNumberSelectable(number: number): void {
    if (number === undefined) return;

    // Check if it's an initial number
    const initialIndex = this.initialNumbers.findIndex(n => n.value === number && n.used);
    if (initialIndex !== -1) {
      this.initialNumbers[initialIndex].used = false;
    }

    // Check if it's a result number
    const resultIndex = this.resultNumbers.findIndex(n => n.value === number && n.used);
    if (resultIndex !== -1) {
      this.resultNumbers[resultIndex].used = false;
    }

    // Update allNumbers for consistency
    const allNumbersIndex = this.allNumbers.findIndex(n => n.value === number && n.used);
    if (allNumbersIndex !== -1) {
      this.allNumbers[allNumbersIndex].used = false;
    }

    // Update availableNumbers for backward compatibility
    if (!this.availableNumbers.includes(number)) {
      this.availableNumbers.push(number);
    }
  }

  clearOperations(): void {
    // Allow clearing even when game is over

    // Reset operations without changing the target number
    this.operations = [];
    this.selectedNumbers = [];
    this.selectedOperator = null;

    // Reset initialNumbers to their initial state
    this.initialNumbers = this.initialAvailableNumbers.map(value => ({ value, used: false }));

    // Clear resultNumbers
    this.resultNumbers = [];

    // Reset all numbers to their initial state for consistency
    this.allNumbers = this.initialAvailableNumbers.map(value => ({ value, used: false }));

    // Restore initial available numbers in original order for backward compatibility
    this.availableNumbers = [...this.initialAvailableNumbers];

    // If game was over due to max operations, allow continuing
    if (this.isGameOver && this.timeLeft > 0 && !this.showSuccessDialog) {
      this.isGameOver = false;
      this.startTimer();
    }
  }

  resetGame(): void {
    this.initGame();
  }

  closeSuccessDialog(): void {
    this.showSuccessDialog = false;
    this.resetGame();
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
