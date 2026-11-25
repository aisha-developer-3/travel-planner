import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBudgetSummary,
  computePackingProgress,
  computeTripDayList,
  deriveTripStatus,
  filterTripsByStatus,
  formatCurrency,
  formatDisplayDate,
  getDaysUntilDeparture,
  getTripDurationDays,
  sortActivitiesByOrderAndTime,
  validateTripStep,
} from './travelMath';
import type { Expense, ItineraryActivity, PackingItem, Trip, TripDraft } from '../types/travel';

test('getTripDurationDays computes inclusive day span accurately', () => {
  assert.equal(getTripDurationDays('2026-10-31', '2026-11-08'), 9);
  assert.equal(getTripDurationDays('2026-05-05', '2026-05-05'), 1);
  assert.equal(getTripDurationDays('2026-05-10', '2026-05-05'), 1);
});

test('getDaysUntilDeparture calculates countdown relative to reference date', () => {
  assert.equal(getDaysUntilDeparture('2026-10-31', '2026-10-03'), 28);
  assert.equal(getDaysUntilDeparture('2026-10-31', '2026-10-31'), 0);
  assert.equal(getDaysUntilDeparture('2026-10-31', '2026-11-02'), -2);
});

test('computeTripDayList builds sequential day items across month boundaries', () => {
  const days = computeTripDayList('2026-10-31', '2026-11-02');
  assert.equal(days.length, 3);
  assert.equal(days[0].dayNumber, 1);
  assert.equal(days[0].dateISO, '2026-10-31');
  assert.equal(days[0].shortDate, 'Oct 31');
  assert.equal(days[1].dateISO, '2026-11-01');
  assert.equal(days[2].dateISO, '2026-11-02');
});

test('computeBudgetSummary separates actual spend from estimated expenses', () => {
  const expenses: Expense[] = [
    { id: '1', tripId: 't1', category: 'Flights', amount: 1380, date: '2026-10-01', description: 'ANA' },
    { id: '2', tripId: 't1', category: 'Accommodation', amount: 480, date: '2026-10-02', description: 'Hotel' },
    { id: '3', tripId: 't1', category: 'Activities', amount: 120, date: '2026-10-03', description: 'Shrine' },
    { id: '4', tripId: 't1', category: 'Food', amount: 500, date: '2026-11-01', description: 'Est food', isEstimated: true },
  ];
  const summary = computeBudgetSummary(4200, expenses);
  assert.equal(summary.totalSpent, 1980);
  assert.equal(summary.estimatedTotal, 500);
  assert.equal(summary.remainingBalance, 2220);
  assert.equal(summary.percentUsed, 47);
  assert.equal(summary.isOverBudget, false);
});

test('computePackingProgress calculates packed and remaining percentages', () => {
  const items: PackingItem[] = [
    { id: '1', tripId: 't1', name: 'Passport', category: 'Documents', packed: true, quantity: 1 },
    { id: '2', tripId: 't1', name: 'Adapter', category: 'Electronics', packed: true, quantity: 1 },
    { id: '3', tripId: 't1', name: 'Jacket', category: 'Clothing', packed: false, quantity: 1 },
    { id: '4', tripId: 't1', name: 'Shoes', category: 'Clothing', packed: false, quantity: 1 },
    { id: '5', tripId: 't1', name: 'Toothbrush', category: 'Toiletries', packed: false, quantity: 1 },
  ];
  const progress = computePackingProgress(items);
  assert.equal(progress.total, 5);
  assert.equal(progress.packed, 2);
  assert.equal(progress.remaining, 3);
  assert.equal(progress.percentage, 40);
});

test('formatCurrency and formatDisplayDate format values predictably', () => {
  assert.equal(formatCurrency(4200, 'USD'), '$4,200');
  assert.equal(formatCurrency(-150, 'EUR'), '-€150');
  assert.equal(formatDisplayDate('2026-10-31', 'MMM d, yyyy'), 'Oct 31, 2026');
  assert.equal(formatDisplayDate('2026-10-31', 'dd/MM/yyyy'), '31/10/2026');
});

test('sortActivitiesByOrderAndTime orders by dayIndex then order then time', () => {
  const activities: ItineraryActivity[] = [
    {
      id: 'b',
      tripId: 't1',
      dayIndex: 0,
      time: '14:00',
      title: 'Explore',
      location: 'Shibuya',
      description: '',
      notes: '',
      category: 'Sightseeing',
      order: 2,
    },
    {
      id: 'a',
      tripId: 't1',
      dayIndex: 0,
      time: '09:00',
      title: 'Arrive',
      location: 'Haneda',
      description: '',
      notes: '',
      category: 'Flight',
      order: 1,
    },
  ];
  const sorted = sortActivitiesByOrderAndTime(activities);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ['a', 'b']
  );
});

test('filterTripsByStatus excludes archived trips from "all" and matches search', () => {
  const trips: Trip[] = [
    {
      id: '1',
      name: 'Japan Spring Escape',
      destination: 'Tokyo & Kyoto',
      country: 'Japan',
      departureDate: '2026-10-31',
      returnDate: '2026-11-08',
      adults: 2,
      children: 0,
      travelerNames: ['Alex', 'Maya'],
      budget: 4200,
      currency: 'USD',
      travelStyle: 'Cultural',
      accommodationPreference: 'Boutique Hotel',
      description: '',
      coverImage: '',
      status: 'upcoming',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      name: 'Old Paris Trip',
      destination: 'Paris',
      country: 'France',
      departureDate: '2024-04-01',
      returnDate: '2024-04-07',
      adults: 1,
      children: 0,
      travelerNames: ['Alex'],
      budget: 2000,
      currency: 'USD',
      travelStyle: 'City',
      accommodationPreference: 'Hotel',
      description: '',
      coverImage: '',
      status: 'archived',
      createdAt: '',
      updatedAt: '',
    },
  ];
  assert.equal(filterTripsByStatus(trips, 'all', '').length, 1);
  assert.equal(filterTripsByStatus(trips, 'archived', '').length, 1);
  assert.equal(filterTripsByStatus(trips, 'all', 'kyoto').length, 1);
  assert.equal(filterTripsByStatus(trips, 'all', 'paris').length, 0);
});

test('validateTripStep rejects empty required inputs and invalid date ranges', () => {
  const emptyDraft: TripDraft = {
    name: '',
    destination: '',
    country: '',
    departureDate: '2026-10-10',
    returnDate: '2026-10-05',
    adults: 0,
    children: -1,
    travelerNamesText: '',
    budget: 0,
    currency: 'USD',
    travelStyle: '',
    accommodationPreference: '',
    description: '',
    coverImage: '',
  };
  const step1Errors = validateTripStep(1, emptyDraft);
  assert.ok(step1Errors.name);
  assert.ok(step1Errors.returnDate);

  const step2Errors = validateTripStep(2, emptyDraft);
  assert.ok(step2Errors.adults);
  assert.ok(step2Errors.children);

  const step3Errors = validateTripStep(3, emptyDraft);
  assert.ok(step3Errors.budget);
});

test('deriveTripStatus accurately classifies upcoming, ongoing, and completed trips', () => {
  assert.equal(deriveTripStatus('2026-12-01', '2026-12-08', '2026-11-24'), 'upcoming');
  assert.equal(deriveTripStatus('2026-11-20', '2026-11-28', '2026-11-24'), 'ongoing');
  assert.equal(deriveTripStatus('2026-05-05', '2026-05-10', '2026-11-24'), 'completed');
});
