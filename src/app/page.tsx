'use client';

import { useState, useEffect } from 'react';
import DudelCanvas from '@/components/DudelCanvas';

export default function Home() {
  const [authorized, setAuthorized] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [sortedIndices, setSortedIndices] = useState<number[]>([]);
  const [userClicks, setUserClicks] = useState<number[]>([]);
  const [gameMessage, setGameMessage] = useState<string>('Click the numbers in ascending order (lowest to highest)');
  
  // Generate random numbers on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      generateRandomNumbers();
    }
  }, []);
  
  // Generate 4 random numbers between 0 and 100
  const generateRandomNumbers = () => {
    const randomNums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 101));
    setNumbers(randomNums);
    
    // Calculate the sorted indices (which index to click first, second, etc.)
    const indices = randomNums.map((_, index) => index);
    indices.sort((a, b) => randomNums[a] - randomNums[b]);
    setSortedIndices(indices);
    
    console.log('Numbers:', randomNums);
    console.log('Click order (indices):', indices);
    console.log('Expected clicks (values):', indices.map(idx => randomNums[idx]));
  };
  
  // Handle number click
  const handleNumberClick = (index: number) => {
    const clickPosition = sortedIndices.indexOf(index);
    const expectedPosition = userClicks.length;
    
    // Check if this is the correct next number to click
    if (clickPosition === expectedPosition) {
      const newClicks = [...userClicks, index];
      setUserClicks(newClicks);
      
      // Complete sequence entered correctly
      if (newClicks.length === sortedIndices.length) {
        setGameMessage('Correct! Accessing Dudel...');
        setTimeout(() => {
          setAuthorized(true);
        }, 1000);
      }
    } else {
      // Incorrect click
      setGameMessage('Incorrect! Try again with a new set of numbers.');
      setUserClicks([]);
      generateRandomNumbers();
    }
  };
  
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Dudel</h1>
          <p className="text-gray-600 mb-8">
            {gameMessage}
          </p>
          
          <div className="text-md mb-4">
            <span className="font-medium">Your progress: </span>
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className={`mx-1 inline-block w-4 h-4 rounded-full ${
                index < userClicks.length ? 'bg-green-500' : 'bg-gray-300'
              }`}></span>
            ))}
          </div>
        </div>
        
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          {/* The numbers to click */}
          <div className="flex justify-center flex-wrap gap-4">
            {numbers.map((num, index) => (
              <button
                key={index}
                className={`w-20 h-20 rounded-lg bg-blue-500 text-white text-2xl font-bold shadow-md hover:bg-blue-600 transition-colors
                  ${userClicks.includes(index) ? 'opacity-50' : 'opacity-100'}`}
                onClick={() => handleNumberClick(index)}
                disabled={userClicks.includes(index)}
              >
                {num}
              </button>
            ))}
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Click the numbers from lowest to highest value
          </div>
        </div>
      </div>
    );
  }
  
  // Show the actual app once authorized
  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-2 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">Dudel</h1>
      <DudelCanvas />
      
      <footer className="mt-8 mb-4 text-sm text-gray-500">
        <a 
          href="https://x.com/ashthepeasant" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-blue-500 transition-colors duration-200"
        >
          @ashthepeasant
        </a> for saru2.com
      </footer>
    </main>
  );
}