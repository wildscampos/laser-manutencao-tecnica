export const SERVICE_CITIES = [
  "Aparecida",
  "Cachoeira Paulista",
  "Canas",
  "Guaratinguetá",
  "Lorena",
  "Potim",
] as const;

export type ServiceCity = (typeof SERVICE_CITIES)[number];

const TRAVEL_FEE_PER_KM = 2;

const paidTravelDistances: Partial<Record<ServiceCity, number>> = {
  "Cachoeira Paulista": 27,
  Canas: 22,
};

export function getTravelFee(cidade: string) {
  const distanceKm = paidTravelDistances[cidade as ServiceCity] ?? 0;
  const fee = distanceKm * TRAVEL_FEE_PER_KM;

  return {
    distanceKm,
    fee,
    feePerKm: TRAVEL_FEE_PER_KM,
    hasTravelFee: fee > 0,
  };
}
