class Metrics {
  constructor() {
    this.bookingAttempts = 0;
    this.bookingSuccesses = 0;
    this.bookingFailures = 0;
    this.startTime = Date.now();
  }

  recordBookingAttempt() {
    this.bookingAttempts++;
  }

  recordBookingSuccess() {
    this.bookingSuccesses++;
  }

  recordBookingFailure() {
    this.bookingFailures++;
  }

  getMetrics() {
    return {
      uptime: ((Date.now() - this.startTime) / 1000).toFixed(2),
      bookingAttempts: this.bookingAttempts,
      bookingSuccesses: this.bookingSuccesses,
      bookingFailures: this.bookingFailures,
      successRate: this.bookingAttempts > 0
        ? ((this.bookingSuccesses / this.bookingAttempts) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

module.exports = new Metrics();
