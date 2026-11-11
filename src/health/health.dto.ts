export class HealthResponseDto {
  status: 'ok' | 'error';
  db: 'ok' | 'down';
}
