import { Component, OnInit, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ScadaService } from './services/scada';
import { Lectura } from './models/lectura.model';
import { timer, switchMap } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    @keyframes spin-gear { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .gear-animation { display: inline-block; font-size: 80px; filter: drop-shadow(0 0 20px rgba(76,175,80,0.15)); transition: all 0.5s; z-index: 2; }
    .rotating { animation: spin-gear 4s linear infinite; }
    .alarm-item { padding: 10px; border-radius: 4px; font-size: 0.75rem; margin-bottom: 8px; border-left: 4px solid; animation: fadeIn 0.5s; }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    .kpi-error { border-top: 4px solid #f44336 !important; background: rgba(244, 67, 54, 0.05); }
    .nav-item { padding: 12px 15px; border-radius: 8px; cursor: pointer; margin-bottom: 10px; transition: 0.3s; color: #888; font-weight: 500; }
    .nav-item.active { background: #2e7d32; color: white; }
    .nav-item:hover:not(.active) { background: #333; color: #ccc; }
    .chart-container { background: #25282c; padding: 20px; border-radius: 12px; }
    .health-bar { height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin-top: 5px; }
    .health-fill { height: 100%; transition: width 0.5s ease; }
  `],
  template: `
  <div style="display: flex; background: #1a1d21; color: white; min-height: 100vh; font-family: 'Segoe UI', sans-serif;">
    <aside style="width: 260px; background: #25282c; padding: 25px; border-right: 1px solid #333;">
      <h2 style="color: #4caf50; margin-bottom: 40px;">Molino <span style="font-weight: 300; font-size: 0.8em; color: #ccc;">SCADA</span></h2>
      <nav>
        <div class="nav-item" [class.active]="vistaActual() === 'realtime'" (click)="setVista('realtime')">🟢 Tiempo Real</div>
        <div class="nav-item" [class.active]="vistaActual() === 'analytics'" (click)="setVista('analytics')">📊 Analíticas</div>
      </nav>
    </aside>

    <main style="flex-grow: 1; padding: 30px; overflow-y: auto;">
      
      <div *ngIf="vistaActual() === 'realtime'">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <div>
            <h1 style="font-size: 1.4rem; margin: 0;">Control de Molino de Bolas</h1>
            <p style="font-size: 0.75rem; color: #666; margin: 0;">Arequipa | Hora: {{ currentTime }}</p>
          </div>
          <div [style.color]="estado() === 'OPERANDO' ? '#4caf50' : '#f44336'" 
               style="background: #1a1d21; padding: 8px 20px; border-radius: 20px; font-size: 0.8rem; border: 1px solid #333; font-weight: bold;">
            ● {{ estado() }}
          </div>
        </header>
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
  
  <div [style.border-top]="(datos() && datos()!.nivel_llenado >= 90) ? '4px solid #f44336' : '4px solid #4caf50'" 
       style="background: #25282c; padding: 15px; border-radius: 8px; transition: all 0.3s ease;">
    <p style="font-size: 0.7rem; color: #888; margin: 0;">LLENADO</p>
    <h2 style="margin: 10px 0;">{{ datos()?.nivel_llenado || 0 }}%</h2>
  </div>

  <div [style.border-top]="(datos() && datos()!.velocidad_rpm >= 15) ? '4px solid #f44336' : '4px solid #4caf50'" 
       style="background: #25282c; padding: 15px; border-radius: 8px; transition: all 0.3s ease;">
    <p style="font-size: 0.7rem; color: #888; margin: 0;">VELOCIDAD</p>
    <h2 style="margin: 10px 0;">{{ datos()?.velocidad_rpm || 0 }} <small style="font-size: 0.5em;">RPM</small></h2>
  </div>

  <div [style.border-top]="(datos() && datos()!.potencia_kw >= 400) ? '4px solid #f44336' : '4px solid #4caf50'" 
       style="background: #25282c; padding: 15px; border-radius: 8px; transition: all 0.3s ease;">
    <p style="font-size: 0.7rem; color: #888; margin: 0;">POTENCIA</p>
    <h2 style="margin: 10px 0;">{{ datos()?.potencia_kw || 0 }} <small style="font-size: 0.5em;">kW</small></h2>
  </div>

  <div [style.border-top]="(datos() && datos()!.tasa_alimentacion_tph >= 180) ? '4px solid #f44336' : '4px solid #4caf50'" 
       style="background: #25282c; padding: 15px; border-radius: 8px; transition: all 0.3s ease;">
    <p style="font-size: 0.7rem; color: #888; margin: 0;">ALIMENTACIÓN</p>
    <h2 style="margin: 10px 0;">{{ datos()?.tasa_alimentacion_tph || 0 }} <small style="font-size: 0.5em;">TPH</small></h2>
  </div>

</div>

        <div style="display: grid; grid-template-columns: 1fr 350px; gap: 20px; margin-bottom: 25px;">
          <div style="background: #25282c; border-radius: 8px; padding: 20px; display: flex; align-items: center; justify-content: center; position: relative; height: 200px;">
            <div class="gear-animation" [class.rotating]="estado() === 'OPERANDO'">⚙️</div>
          </div>
          <div style="background: #25282c; padding: 20px; border-radius: 8px; max-height: 200px; overflow-y: auto;">
      <h3 style="font-size: 0.8rem; color: #888; margin: 0 0 15px 0;">ALARMAS ACTIVAS</h3>
      <div *ngFor="let a of alarmas() || []" 
           [style.border-left]="a.mensaje.includes('CRÍTICO') ? '4px solid #f44336' : '4px solid #4caf50'"
           style="padding-left: 10px; margin-bottom: 10px; background: #1a1d21; border-radius: 4px; padding: 8px;">
        <strong [style.color]="a.mensaje.includes('CRÍTICO') ? '#f44336' : '#fff'">
          {{ a.mensaje }}
        </strong> 
        <br> 
        <small style="color: #666;">{{ a.hora }}</small>
      </div>
    </div>
  </div>


        <div style="background: #25282c; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="font-size: 0.8rem; color: #888; margin: 0 0 15px 0;">CONSUMO EN TIEMPO REAL</h3>
          <div style="height: 200px;"><canvas id="realtimeChart"></canvas></div>
        </div>

        <div style="background: #25282c; padding: 20px; border-radius: 8px; display: flex; gap: 20px; align-items: center;">
          <button (click)="enviarComando('OPERANDO')" [disabled]="estado() === 'OPERANDO'" style="background: #2e7d32; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">INICIAR</button>
          <button (click)="enviarComando('DETENIDO')" [disabled]="estado() === 'DETENIDO'" style="background: #c62828; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">PARADA</button>
          <div style="flex-grow: 1;"></div>
          <input type="number" [(ngModel)]="setpointRpm" style="background: #1a1d21; color: #4caf50; border: 1px solid #444; padding: 8px; width: 80px; border-radius: 4px;">
          <button (click)="aplicarSetpoint()" style="background: #2196f3; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">ACTUALIZAR DB</button>
        </div>
      </div> <div *ngIf="vistaActual() === 'analytics'">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h1 style="font-size: 1.4rem; margin: 0;">Inteligencia Operativa</h1>
          <button (click)="descargarReporte()" style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">📄 GENERAR REPORTE PDF</button>
        </header>

        <div id="reporte-seccion" style="background: #1a1d21; padding: 20px; border-radius: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div class="chart-container" style="text-align: center; background: #25282c; padding: 20px; border-radius: 8px;">
              <h3 style="font-size: 0.8rem; color: #888;">RENDIMIENTO OEE</h3>
              <h1 style="font-size: 3rem; color: #4caf50;">88.4%</h1>
            </div>
            <div class="chart-container" style="background: #25282c; padding: 20px; border-radius: 8px;">
              <h3 style="font-size: 0.8rem; color: #888;">SALUD DE ACTIVO</h3>
              <span>REVESTIMIENTOS</span>
              <div class="health-bar" style="background: #333; height: 10px; border-radius: 5px; margin-top: 10px;">
                <div style="width: 35%; background: #ff9800; height: 100%; border-radius: 5px;"></div>
              </div>
            </div>
            <div class="chart-container" style="text-align: center; background: #25282c; padding: 20px; border-radius: 8px;">
              <h3 style="font-size: 0.8rem; color: #888;">COSTO POR TURNO</h3>
              <h2>$ 1,240.50</h2>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="background: #25282c; padding: 20px; border-radius: 8px; height: 300px;"><canvas id="efficiencyChart"></canvas></div>
            <div style="background: #25282c; padding: 20px; border-radius: 8px; height: 300px;"><canvas id="loadHistogram"></canvas></div>
          </div>

          <div class="card-historial" style="background: #252a30; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 0.9rem; color: #4db8ff; margin-bottom: 15px;">LOG DE EVENTOS (POSTGRESQL)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="color: #666; border-bottom: 1px solid #333; text-align: left;">
                  <th style="padding: 8px;">Hora</th>
                  <th style="padding: 8px;">Evento</th>
                  <th style="padding: 8px;">Categoría</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let ev of listaEventos" style="border-bottom: 1px solid #1e2227;">
                  <td style="padding: 8px;">{{ ev.fecha_hora | date:'HH:mm:ss' }}</td>
                  <td style="padding: 8px;">{{ ev.descripcion }}</td>
                  <td style="padding: 8px;"><span [style.color]="ev.tipo === 'ALERTA' ? '#ff4d4d' : '#4dff88'">{{ ev.tipo }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div> 
      </div>

    </main>
  </div>
`,
})
export class AppComponent implements OnInit, AfterViewInit {
  datos = signal<Lectura | null>(null);
  estado = signal<string>('OPERANDO');
  vistaActual = signal<string>('realtime');
  alarmas = signal<any[]>([]);
  setpointRpm: number = 12.8;
  
  chart: any;
  effChart: any;
  loadChart: any;
  listaEventos: any[] = [];
  currentTime: string = '';
  lecturaActual: any = { llenado: 0, estado_actual: 'DETENIDO' };
  
  Calcularestado(): string {
    if (this.lecturaActual && this.lecturaActual.llenado >= 90) {
      return 'CRÍTICO'; 
    }
    return this.lecturaActual?.estado_actual || 'DETENIDO';
  }
async descargarReporte() {
  const DATA = document.getElementById('reporte-seccion'); // Seccion que queremos convertir
  const doc = new jsPDF('p', 'pt', 'a4');
  const options = {
    background: 'white',
    scale: 3
  };

  if (DATA) {
    // Añadimos un encabezado formal antes de la captura
    doc.setFontSize(18);
    doc.text("REPORTE OPERATIVO - MOLINO DE BOLAS", 40, 40);
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 40, 60);
    doc.text("Responsable: Oliver ", 40, 75);

    html2canvas(DATA, options).then((canvas) => {
      const img = canvas.toDataURL('image/PNG');

      // Añadimos la imagen de los gráficos al PDF
      const bufferX = 40;
      const bufferY = 100;
      const imgProps = (doc as any).getImageProperties(img);
      const pdfWidth = doc.internal.pageSize.getWidth() - 80;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.addImage(img, 'PNG', bufferX, bufferY, pdfWidth, pdfHeight, undefined, 'FAST');
      return doc;
    }).then((docResult) => {
      docResult.save(`Reporte_Molino_${new Date().toLocaleDateString()}.pdf`);
    });
  }

  
  
}
  constructor(private scadaService: ScadaService) {}

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.cargarHistorial();
    timer(0, 2000).pipe(
      switchMap(() => this.scadaService.getUltimaLectura())
    ).subscribe({
      next: (res) => {
        this.datos.set(res);
        this.procesarAlarmas(res);
        if (this.chart && this.estado() === 'OPERANDO' && this.vistaActual() === 'realtime') {
          this.actualizarGrafico(res.potencia_kw);
        }
      }
    });
  }

  // MÉTODO PARA CAMBIAR DATOS EN LA BASE DE DATOS
  aplicarSetpoint() {
    if (this.setpointRpm < 0 || this.setpointRpm > 25) {
      // Notificación de advertencia elegante
      Swal.fire({
        icon: 'warning',
        title: 'Fuera de rango',
        text: 'El valor debe estar entre 0 y 25 RPM',
        background: '#1a1d21',
        color: '#fff'
      });
      return;
    }
  
    this.scadaService.actualizarSetpoint(this.setpointRpm).subscribe({
      next: (res) => {
        this.addAlarma(`DB: Setpoint actualizado a ${this.setpointRpm} RPM`, 'INFO', new Date().toLocaleTimeString());
        
        // --- AQUÍ ESTÁ EL TRUCO PARA QUE SALGA EN LA ESQUINA ---
        Swal.fire({
          toast: true,
          position: 'top-end', // Esquina superior derecha
          icon: 'success',
          title: 'PostgreSQL: Sincronizado',
          text: `Nuevo Setpoint: ${this.setpointRpm} RPM`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#1e1e1e',
          color: '#4dff88'
        });
        this.cargarHistorial();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error de servidor',
          text: 'No se pudo conectar con Node.js',
          background: '#1a1d21',
          color: '#ff4d4d'
        });
      }
    });
  }




  enviarComando(nuevo: string) {
  this.scadaService.actualizarEstadoMotor(nuevo).subscribe(() => {
    this.estado.set(nuevo);
    // REGISTRO EN EL HISTORIAL REAL
    this.scadaService.registrarEvento('CAMBIO DE ESTADO', 'CONTROL', `Motor cambiado a ${nuevo}`).subscribe();
    this.addAlarma(`Motor: ${nuevo}`, 'INFO', new Date().toLocaleTimeString());
  });
}
cargarHistorial() {
    this.scadaService.getEventosRecientes().subscribe({
      next: (data) => {
        this.listaEventos = data;
      },
      error: (err) => console.error("Error al traer historial:", err)
    });
  }
  setVista(nueva: string) {
    this.vistaActual.set(nueva);
    setTimeout(() => {
      if (nueva === 'realtime') this.initChart();
      if (nueva === 'analytics') { this.initEfficiencyChart(); this.initLoadHistogram(); }
    }, 50);
  }

  updateTime() { this.currentTime = new Date().toLocaleTimeString(); }

  procesarAlarmas(d: Lectura) {
    const hora = new Date().toLocaleTimeString();
    if (d.nivel_llenado > 85) this.addAlarma('¡CRÍTICO: Nivel de llenado alto!', 'CRITICA', hora);
    if (d.potencia_kw > 450) this.addAlarma('ADVERTENCIA: Sobretensión', 'ADVERTENCIA', hora);
  }

  addAlarma(msg: string, tipo: string, hora: string) {
    if (!this.alarmas().some(a => a.mensaje === msg)) {
      this.alarmas.update(prev => [{mensaje: msg, tipo, hora}, ...prev].slice(0, 5));
    }
  }

  ngAfterViewInit() { this.initChart(); }

  initChart() {
    const ctx = document.getElementById('realtimeChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Potencia', data: [], borderColor: '#ff9800', backgroundColor: 'rgba(255, 152, 0, 0.1)', fill: true, tension: 0.4, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#333' }, ticks: { color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } }, plugins: { legend: { display: false } } }
    });
  }

  initEfficiencyChart() {
    const ctx = document.getElementById('efficiencyChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.effChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Turno A', 'Turno B', 'Turno C', 'Turno D'],
        datasets: [{ label: 'kWh/t', data: [2.4, 2.8, 2.1, 2.5], backgroundColor: '#2196f3' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  initLoadHistogram() {
    const ctx = document.getElementById('loadHistogram') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.loadChart) { this.loadChart.destroy(); }

    this.loadChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Baja', 'Óptima', 'Sobrecarga'],
        datasets: [{
          data: [15, 70, 15],
          backgroundColor: ['#2196f3', '#4caf50', '#f44336'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  actualizarGrafico(v: number) {
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.chart.data.labels.push(t);
    this.chart.data.datasets[0].data.push(v);
    if (this.chart.data.labels.length > 15) { this.chart.data.labels.shift(); this.chart.data.datasets[0].data.shift(); }
    this.chart.update('none');
  }
}