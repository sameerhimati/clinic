// Doctor commission calculation — matches legacy Centura fnCommission logic
// Source: Clinic1.apt fnCommission function

export interface CommissionInput {
  receivedAmount: number;
  labRate: number;
  previousPayments: number;
  doctorPercent: number;
  doctorRate: number | null; // fixed-rate doctors
  tdsPercent: number;
}

export interface CommissionResult {
  doctorAmount: number;
  tds: number;
  netCommission: number;
  clinicAmount: number;
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const { receivedAmount, labRate, previousPayments, doctorPercent, doctorRate, tdsPercent } = input;

  let doctorAmount = 0;
  let clinicAmount = 0;

  if (doctorRate && doctorRate > 0) {
    // Fixed-rate commission
    const totalPrev = previousPayments;
    if (totalPrev > (doctorRate + labRate)) {
      // Previous payments already exceeded rate + lab, clinic gets everything
      clinicAmount = receivedAmount;
      doctorAmount = 0;
    } else if (previousPayments > 0) {
      doctorAmount = (doctorRate + labRate) - previousPayments;
      if (doctorAmount > receivedAmount) doctorAmount = receivedAmount;
      clinicAmount = receivedAmount - doctorAmount;
    } else {
      if (receivedAmount > (labRate + doctorRate)) {
        doctorAmount = doctorRate;
      } else {
        doctorAmount = Math.max(0, receivedAmount - labRate);
      }
      clinicAmount = receivedAmount - labRate - doctorAmount;
    }
  } else {
    // Percentage-based commission (fnCommission from Clinic1.apt)
    // If (nRecvAmt + nPrevAmt) > nLabRate then calculate, else 0
    if ((receivedAmount + previousPayments) > labRate) {
      if (previousPayments >= labRate) {
        doctorAmount = (doctorPercent * receivedAmount) / 100;
      } else {
        doctorAmount = (doctorPercent * ((receivedAmount + previousPayments) - labRate)) / 100;
      }
    } else {
      doctorAmount = 0;
    }

    // Clinic amount calculation from legacy
    if (previousPayments > 0) {
      clinicAmount = receivedAmount - doctorAmount;
    } else {
      if ((receivedAmount - labRate) > 0) {
        clinicAmount = (receivedAmount - labRate) - doctorAmount;
      } else {
        clinicAmount = 0;
      }
    }
  }

  // Ensure non-negative
  doctorAmount = Math.max(0, doctorAmount);

  // TDS calculation (matches legacy: SalNumberRound)
  const tds = Math.round((tdsPercent * doctorAmount) / 100);
  const netCommission = Math.round(doctorAmount - tds);

  return {
    doctorAmount: Math.round(doctorAmount),
    tds,
    netCommission,
    clinicAmount: Math.round(clinicAmount),
  };
}
