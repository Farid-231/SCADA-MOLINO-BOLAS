import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // <-- Cambiamos App por AppComponent

bootstrapApplication(AppComponent, appConfig) // <-- Aquí también
  .catch((err) => console.error(err));