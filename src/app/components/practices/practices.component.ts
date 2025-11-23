import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval, Subscription, BehaviorSubject } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

// Veri Modelleri
interface SourceNumber {
    id: number;
    value: number;
    isUsed: boolean;
}

interface Operand {
    value: number;
    sourceType: 'initial' | 'row-result';
    sourceIndex: number;
}

interface CalculationRow {
    leftOperand: Operand | null;
    rightOperand: Operand | null;
    operator: '+' | '-' | '*' | '/' | null;
    result: number | null;
    isValid: boolean;
}

interface GameState {
    sourceNumbers: SourceNumber[];
    calculationRows: CalculationRow[];
    currentScore: number;
}

interface ScoreDetails {
    total: number;
    base: number;
    timeBonus: number;
    opsBonus: number;
    distance: number;
}

@Component({
    selector: 'app-practices',
    standalone: true,
    imports: [RouterLink, CommonModule],
    templateUrl: './practices.component.html',
    styleUrls: ['./practices.component.scss']
})
export class PracticesComponent implements OnInit, OnDestroy {

    // --- Sabitler ---
    readonly TARGET_MIN = 100;
    readonly TARGET_MAX = 999;
    readonly GAME_TIME = 90;
    readonly MAX_DISTANCE_FOR_POINT = 10; // Puan almak için kabul edilebilir maksimim fark

    // --- Oyun Durumu ---
    targetNumber = 0;
    timeLeft = this.GAME_TIME;
    currentScore = 0;
    isGameOver = false;
    showSuccessDialog = false;

    // Skor Detayları (Dialogda göstermek için)
    scoreDetails: ScoreDetails = { total: 0, base: 0, timeBonus: 0, opsBonus: 0, distance: 0 };

    // --- Veri Yapıları ---
    sourceNumbers: SourceNumber[] = [];
    calculationRows: CalculationRow[] = [];

    // Undo Geçmişi
    historyStack: string[] = [];

    // RxJS
    private timerSubscription: Subscription | null = null;
    private gameActive = new BehaviorSubject<boolean>(false);

    ngOnInit(): void {
        this.initGame();
    }

    ngOnDestroy(): void {
        this.stopTimer();
    }

    // --- Başlangıç ---

    initGame(): void {
        this.stopTimer();
        this.targetNumber = Math.floor(Math.random() * (this.TARGET_MAX - this.TARGET_MIN)) + this.TARGET_MIN;
        this.timeLeft = this.GAME_TIME;
        this.isGameOver = false;
        this.showSuccessDialog = false;
        this.historyStack = [];
        this.currentScore = 0;
        this.scoreDetails = { total: 0, base: 0, timeBonus: 0, opsBonus: 0, distance: 0 };

        this.generateSourceNumbers();

        this.calculationRows = Array(5).fill(null).map(() => ({
            leftOperand: null,
            rightOperand: null,
            operator: null,
            result: null,
            isValid: true
        }));

        this.startTimer();
    }

    generateSourceNumbers() {
        // 1-9 arası 5 adet küçük sayı üret
        const smalls = Array(5).fill(0).map(() => Math.floor(Math.random() * 9) + 1);

        // Listeden 1 adet büyük sayı seç
        const bigs = [10, 25, 50, 75, 100];
        const chosenBig = bigs[Math.floor(Math.random() * bigs.length)];

        // Sadece küçük sayıları kendi içinde karıştır
        smalls.sort(() => Math.random() - 0.5);

        // Büyük sayıyı en sona ekle
        const all = [...smalls, chosenBig];

        this.sourceNumbers = all.map((val, idx) => ({
            id: idx,
            value: val,
            isUsed: false
        }));
    }

    get nextEmptySlot(): { rowIndex: number, side: 'left' | 'right' } | null {
        for (let i = 0; i < this.calculationRows.length; i++) {
            if (!this.calculationRows[i].leftOperand) {
                return { rowIndex: i, side: 'left' };
            }
            if (!this.calculationRows[i].rightOperand) {
                return { rowIndex: i, side: 'right' };
            }
        }
        return null;
    }

    // --- Kullanıcı Etkileşimleri ---

    onOperandClick(rowIndex: number, side: 'left' | 'right') {
        if (this.isGameOver) return;

        const row = this.calculationRows[rowIndex];
        const operand = side === 'left' ? row.leftOperand : row.rightOperand;

        if (operand) {
            this.saveStateToHistory();
            if (side === 'left') row.leftOperand = null;
            else row.rightOperand = null;

            this.recalculateAll();
        }
    }

    onSourceNumberClick(sourceNum: SourceNumber) {
        if (sourceNum.isUsed || this.isGameOver) return;

        const target = this.nextEmptySlot;
        if (!target) return;

        this.saveStateToHistory();

        const row = this.calculationRows[target.rowIndex];
        const newOperand: Operand = {
            value: sourceNum.value,
            sourceType: 'initial',
            sourceIndex: sourceNum.id
        };

        if (target.side === 'left') row.leftOperand = newOperand;
        else row.rightOperand = newOperand;

        this.recalculateAll();
    }

    onResultClick(sourceRowIndex: number) {
        if (this.isGameOver) return;

        const sourceRow = this.calculationRows[sourceRowIndex];
        if (sourceRow.result === null) return;

        const target = this.nextEmptySlot;
        if (!target || target.rowIndex <= sourceRowIndex) return;

        this.saveStateToHistory();

        const newOperand: Operand = {
            value: sourceRow.result,
            sourceType: 'row-result',
            sourceIndex: sourceRowIndex
        };

        if (target.side === 'left') this.calculationRows[target.rowIndex].leftOperand = newOperand;
        else this.calculationRows[target.rowIndex].rightOperand = newOperand;

        this.recalculateAll();
    }

    setOperator(rowIndex: number, op: '+' | '-' | '*' | '/') {
        if (this.isGameOver) return;
        if (this.calculationRows[rowIndex].operator === op) return;

        this.saveStateToHistory();
        this.calculationRows[rowIndex].operator = op;
        this.recalculateAll();
    }

    // --- Çekirdek Mantık ---

    recalculateAll() {
        this.sourceNumbers.forEach(s => s.isUsed = false);

        for (let i = 0; i < this.calculationRows.length; i++) {
            const row = this.calculationRows[i];

            // Sol operand
            if (row.leftOperand) {
                if (row.leftOperand.sourceType === 'initial') {
                    const source = this.sourceNumbers.find(s => s.id === row.leftOperand!.sourceIndex);
                    if (source) source.isUsed = true;
                } else {
                    const prevRow = this.calculationRows[row.leftOperand.sourceIndex];
                    if (prevRow && prevRow.result !== null) {
                        row.leftOperand.value = prevRow.result;
                    } else {
                        row.leftOperand = null;
                    }
                }
            }

            // Sağ operand
            if (row.rightOperand) {
                if (row.rightOperand.sourceType === 'initial') {
                    const source = this.sourceNumbers.find(s => s.id === row.rightOperand!.sourceIndex);
                    if (source) source.isUsed = true;
                } else {
                    const prevRow = this.calculationRows[row.rightOperand.sourceIndex];
                    if (prevRow && prevRow.result !== null) {
                        row.rightOperand.value = prevRow.result;
                    } else {
                        row.rightOperand = null;
                    }
                }
            }

            // İşlem
            if (row.leftOperand && row.rightOperand && row.operator) {
                const v1 = row.leftOperand.value;
                const v2 = row.rightOperand.value;
                let res = 0;

                switch (row.operator) {
                    case '+': res = v1 + v2; break;
                    case '-': res = v1 - v2; break;
                    case '*': res = v1 * v2; break;
                    case '/': res = v1 / v2; break;
                }

                row.result = Math.round(res * 100) / 100;
                row.isValid = Number.isInteger(res) && res >= 0;
            } else {
                row.result = null;
                row.isValid = true;
            }
        }

        // Sadece tam isabet varsa oyunu anında bitir
        const exactMatch = this.calculationRows.some(r => r.result === this.targetNumber);
        if (exactMatch) {
            this.finishGame(0); // 0 fark ile bitir
        }
    }

    // En iyi (hedefe en yakın) sonucu bulur
    getBestResultDiff(): number {
        let minDiff = Number.MAX_VALUE;

        this.calculationRows.forEach(row => {
            if (row.result !== null) {
                const diff = Math.abs(this.targetNumber - row.result);
                if (diff < minDiff) {
                    minDiff = diff;
                }
            }
        });

        return minDiff === Number.MAX_VALUE ? this.targetNumber : minDiff;
    }

    finishGame(distance: number) {
        this.stopTimer();
        this.isGameOver = true;
        this.calculateScore(distance);
        this.currentScore += this.scoreDetails.total;
        this.showSuccessDialog = true;
    }

    // --- SKOR FONKSİYONU ---
    calculateScore(distance: number) {
        let base = 0;
        let timeBonus = 0;
        let opsBonus = 0;

        // 1. Baz Puan (Yakınlığa göre)
        if (distance === 0) {
            base = 1000; // Tam isabet
        } else if (distance <= this.MAX_DISTANCE_FOR_POINT) {
            // 10 fark varsa 0, 1 fark varsa 450 puan
            base = (this.MAX_DISTANCE_FOR_POINT - distance) * 50;
        }

        // 2. Süre Bonusu (Her saniye 10 puan)
        // Tam isabet değilse süre bonusunu yarıya düşürebiliriz veya vermeyebiliriz.
        // Burada tam isabet değilse de veriyoruz ama motivasyon olsun.
        timeBonus = this.timeLeft * 10;

        // 3. Verimlilik Bonusu (Daha az satır kullanma)
        // Sadece sonuç geçerliyse (puan alınmışsa) verimlilik ekle
        if (base > 0) {
            const usedRows = this.calculationRows.filter(r => r.result !== null).length;
            const unusedRows = 5 - usedRows;
            opsBonus = unusedRows * 50;
        }

        const total = base + timeBonus + opsBonus;

        this.scoreDetails = {
            total,
            base,
            timeBonus,
            opsBonus,
            distance
        };
    }

    // --- Undo / History ---

    saveStateToHistory() {
        const state: GameState = {
            sourceNumbers: JSON.parse(JSON.stringify(this.sourceNumbers)),
            calculationRows: JSON.parse(JSON.stringify(this.calculationRows)),
            currentScore: this.currentScore
        };
        this.historyStack.push(JSON.stringify(state));
    }

    undoLastAction() {
        if (this.historyStack.length === 0) return;

        const previousJson = this.historyStack.pop();
        if (previousJson) {
            const state: GameState = JSON.parse(previousJson);
            this.sourceNumbers = state.sourceNumbers;
            this.calculationRows = state.calculationRows;
            this.currentScore = state.currentScore;
        }
    }

    clearAll() {
        this.saveStateToHistory();
        this.calculationRows.forEach(r => {
            r.leftOperand = null;
            r.rightOperand = null;
            r.operator = null;
            r.result = null;
        });
        this.recalculateAll();
    }

    resetGame() {
        this.initGame();
    }

    isNextTarget(rowIndex: number, side: 'left' | 'right'): boolean {
        const target = this.nextEmptySlot;
        return target !== null && target.rowIndex === rowIndex && target.side === side;
    }

    startTimer() {
        this.gameActive.next(true);
        this.timerSubscription = interval(1000).pipe(takeWhile(() => this.gameActive.value)).subscribe(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
            } else {
                // Süre bitti!
                this.stopTimer();
                const bestDiff = this.getBestResultDiff();

                if (bestDiff <= this.MAX_DISTANCE_FOR_POINT) {
                    // Süre bitti ama yeterince yakınız
                    this.finishGame(bestDiff);
                } else {
                    // Kaybettik
                    this.isGameOver = true;
                }
            }
        });
    }

    stopTimer() {
        this.gameActive.next(false);
    }

    formatTime(s: number): string {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    }
}