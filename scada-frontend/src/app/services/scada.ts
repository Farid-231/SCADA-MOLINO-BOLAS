import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lectura } from '../models/lectura.model';

@Injectable({
  providedIn: 'root'
})
export class ScadaService {
  // Ruta base sincronizada con el backend en el puerto 3000
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  /** * SECCIÓN: MONITOREO EN TIEMPO REAL
   */

  // Obtener la última lectura de los sensores (Nivel, RPM, Temperatura)
  getUltimaLectura(): Observable<Lectura> {
    return this.http.get<Lectura>(`${this.apiUrl}/lecturas`);
  }

  // Obtener historial de alarmas y eventos recientes
  getEventosRecientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/eventos/recientes`);
  }

  // Obtener el estado general de los activos (Salud de motores, etc.)
  getSaludActivos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/activos/salud`);
  }

  /** * SECCIÓN: CONTROL Y COMANDOS
   */

  // Actualizar el Setpoint de RPM enviado al PLC/Simulador
  actualizarSetpoint(nuevoRpm: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/configuracion/1`, { setpoint_rpm: nuevoRpm });
  }

  // Cambiar estado físico del motor (OPERANDO/DETENIDO)
  actualizarEstadoMotor(estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/estado/1`, { estado_actual: estado });
  }

  /** * SECCIÓN: SEGURIDAD Y ALERTAS
   */

  // Registrar una nueva alerta o evento en la base de datos
  registrarEvento(evento: string, tipo: string, desc: string): Observable<any> {
    const payload = { 
      evento: evento, 
      tipo: tipo, 
      descripcion: desc,
      fecha: new Date() // Opcional: El backend suele ponerlo solo, pero aquí aseguramos
    };
    return this.http.post(`${this.apiUrl}/eventos`, payload);
  }
  


}