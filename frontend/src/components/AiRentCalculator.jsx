import React, { useState } from 'react';
import './AiRentCalculator.css';

const AiRentCalculator = () => {
  const [days, setDays] = useState('');
  const [rent, setRent] = useState('');
  const [calculatedRent, setCalculatedRent] = useState(null);

  const handleCalculate = () => {
    if (days && rent) {
      const dailyRent = rent / 30;
      const calculated = dailyRent * days;
      setCalculatedRent(calculated.toFixed(2));
    }
  };

  return (
    <div className="ai-rent-calculator card">
      <div className="card-header">
        <h2>AI Rent Calculator</h2>
      </div>
      <div className="calculator-body">
        <div className="form-group">
          <label htmlFor="days">Number of Days Stayed</label>
          <input
            type="number"
            id="days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="e.g., 15"
          />
        </div>
        <div className="form-group">
          <label htmlFor="rent">Monthly Rent</label>
          <input
            type="number"
            id="rent"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            placeholder="e.g., 10000"
          />
        </div>
        <button onClick={handleCalculate} className="btn-primary">
          Calculate Rent
        </button>
        {calculatedRent !== null && (
          <div className="calculated-rent">
            <h3>Calculated Rent:</h3>
            <p>₹{calculatedRent}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiRentCalculator;
