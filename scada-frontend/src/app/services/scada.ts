import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lectura } from '../models/lectura.model';

@Injectable({
  providedIn: 'root'
})
export class ScadaService {
  // Ruta base sincronizada con el index.js
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener datos en tiempo real
  getUltimaLectura(): Observable<Lectura> {
    return this.http.get<Lectura>(`${this.apiUrl}/lecturas`);
  }

  // Actualizar el Setpoint de RPM
  actualizarSetpoint(nuevoRpm: number) {
    return this.http.patch(`${this.apiUrl}/configuracion/1`, { setpoint_rpm: nuevoRpm });
  }

  // Cambiar estado OPERANDO/DETENIDO
  actualizarEstadoMotor(estado: string) {
    return this.http.patch(`${this.apiUrl}/estado/1`, { estado_actual: estado });
  }

  // Añada estos métodos a su ScadaService
getEventosRecientes(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/eventos/recientes`);
}

getSaludActivos(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/activos/salud`);
}

  // Guardar en la tabla de historial
  registrarEvento(evento: string, tipo: string, desc: string) {
    return this.http.post(`${this.apiUrl}/eventos`, { evento, tipo, descripcion: desc });
  }
}