// Quote progress tracking for better UX
export interface QuoteProgress {
  stage: 'checking-cache' | 'trying-aggregators' | 'found-quote' | 'error';
  currentAggregator?: string;
  aggregatorsTried: string[];
  isComplete: boolean;
  startTime: number;
  elapsedTime: number;
}

export class QuoteProgressTracker {
  private progress: QuoteProgress;
  private callbacks: ((progress: QuoteProgress) => void)[] = [];

  constructor() {
    this.progress = {
      stage: 'checking-cache',
      aggregatorsTried: [],
      isComplete: false,
      startTime: Date.now(),
      elapsedTime: 0,
    };
  }

  onUpdate(callback: (progress: QuoteProgress) => void) {
    this.callbacks.push(callback);
    // Immediately call with current progress
    callback(this.progress);
  }

  updateProgress(updates: Partial<QuoteProgress>) {
    this.progress = {
      ...this.progress,
      ...updates,
      elapsedTime: Date.now() - this.progress.startTime,
    };
    
    this.callbacks.forEach(callback => callback(this.progress));
  }

  startTryingAggregator(aggregator: string) {
    this.updateProgress({
      stage: 'trying-aggregators',
      currentAggregator: aggregator,
    });
  }

  aggregatorCompleted(aggregator: string, success: boolean) {
    const newTried = [...this.progress.aggregatorsTried];
    if (!newTried.includes(aggregator)) {
      newTried.push(aggregator);
    }

    this.updateProgress({
      aggregatorsTried: newTried,
      currentAggregator: success ? undefined : this.progress.currentAggregator,
    });
  }

  foundQuote(aggregator: string) {
    this.updateProgress({
      stage: 'found-quote',
      currentAggregator: aggregator,
      isComplete: true,
    });
  }

  error(error: string) {
    this.updateProgress({
      stage: 'error',
      currentAggregator: undefined,
      isComplete: true,
    });
  }

  getProgress(): QuoteProgress {
    return { ...this.progress };
  }
}
