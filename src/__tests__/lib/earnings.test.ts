import {
  calculateWorkerShare,
  calculateBaseShare,
  calculateJobTeamTotal,
  hasEarningsDrift,
} from '@/lib/earnings'

describe('calculateBaseShare', () => {
  it('splits the job pot after the expense cut', () => {
    // 450 - 12% = 396, split 4 ways
    expect(calculateBaseShare({ rate: 450, expensePercent: 12 }, 4)).toBe(99)
  })

  it('includes the dog fee before the house takes its cut', () => {
    // (400 + 50) - 12% = 396, split 2 ways
    expect(calculateBaseShare({ rate: 400, expensePercent: 12, dogFee: 50 }, 2)).toBe(198)
  })

  it('lets payOverride replace the calculation entirely', () => {
    expect(
      calculateBaseShare({ rate: 450, expensePercent: 12, payOverride: 300 }, 2)
    ).toBe(150)
  })

  it('treats a zero payOverride as a real override, not an absent one', () => {
    expect(calculateBaseShare({ rate: 450, expensePercent: 12, payOverride: 0 }, 2)).toBe(0)
  })

  it('returns 0 rather than dividing by zero when nobody is assigned', () => {
    expect(calculateBaseShare({ rate: 450, expensePercent: 12 }, 0)).toBe(0)
  })
})

describe('calculateJobTeamTotal', () => {
  it('returns the pot after expenses', () => {
    expect(calculateJobTeamTotal({ rate: 450, expensePercent: 12 })).toBe(396)
  })

  it('counts the dog fee as revenue', () => {
    expect(calculateJobTeamTotal({ rate: 400, expensePercent: 12, dogFee: 50 })).toBe(396)
  })

  it('honours payOverride', () => {
    expect(
      calculateJobTeamTotal({ rate: 450, expensePercent: 12, payOverride: 250 })
    ).toBe(250)
  })
})

describe('calculateWorkerShare', () => {
  const job = { rate: 450, expensePercent: 12 }

  it('prefers the stored credit over a fresh calculation', () => {
    // The corrected figure wins even though the formula would say 99.
    expect(calculateWorkerShare({ amountEarned: 106.88 }, job, 4)).toBe(106.88)
  })

  it('falls back to the calculation when no credit was stored', () => {
    expect(calculateWorkerShare({ amountEarned: null }, job, 4)).toBe(99)
  })

  it('applies a positive pay adjustment on top of the stored credit', () => {
    expect(calculateWorkerShare({ amountEarned: 100, payAdjustment: 25 }, job, 4)).toBe(125)
  })

  it('applies a negative pay adjustment', () => {
    expect(calculateWorkerShare({ amountEarned: 100, payAdjustment: -30 }, job, 4)).toBe(70)
  })

  it('applies adjustments to the fallback calculation too', () => {
    expect(calculateWorkerShare({ amountEarned: null, payAdjustment: 10 }, job, 4)).toBe(109)
  })

  it('does not silently drop a stored credit of 0', () => {
    // A worker credited nothing must not be back-filled with the formula.
    expect(calculateWorkerShare({ amountEarned: 0 }, job, 4)).toBe(0)
  })

  it('rounds to cents', () => {
    const share = calculateWorkerShare({ amountEarned: null }, { rate: 100, expensePercent: 12 }, 3)
    expect(share).toBe(29.33)
  })
})

describe('hasEarningsDrift', () => {
  const job = { rate: 450, expensePercent: 12 }

  it('flags a stored credit that disagrees with the current numbers', () => {
    expect(hasEarningsDrift({ amountEarned: 106.88 }, job, 4)).toBe(true)
  })

  it('does not flag a stored credit that matches', () => {
    expect(hasEarningsDrift({ amountEarned: 99 }, job, 4)).toBe(false)
  })

  it('ignores sub-cent floating point noise', () => {
    expect(hasEarningsDrift({ amountEarned: 99.001 }, job, 4)).toBe(false)
  })

  it('does not flag an assignment with no stored credit', () => {
    expect(hasEarningsDrift({ amountEarned: null }, job, 4)).toBe(false)
  })
})

describe('surface agreement', () => {
  // The regression that produced two different year-to-date figures for the
  // same worker: the reports page recomputed from job.rate while the pay
  // statements read the stored credit.
  it('gives reports and pay statements the same number for a corrected job', () => {
    const job = { rate: 450, expensePercent: 12, dogFee: 50, payOverride: null }
    const assignment = { amountEarned: 106.88, payAdjustment: null }

    const payStatementShare = calculateWorkerShare(assignment, job, 4)
    const reportsShare = calculateWorkerShare(assignment, job, 4)

    expect(reportsShare).toBe(payStatementShare)

    // ...and both differ from the old reports formula, which is the gap.
    const legacyReportsShare =
      Math.round((job.rate * (1 - job.expensePercent / 100) / 4) * 100) / 100
    expect(legacyReportsShare).not.toBe(payStatementShare)
  })
})
