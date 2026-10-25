// Ejecuta cada cierto tiempo las tareas de mantenimiento. Un fallo en una tarea se registra y no impide
// que corran las demás ni la siguiente vuelta.
class MaintenanceWorker {
  constructor(tasks, intervalMs = 60 * 60 * 1000) {
    this.tasks = tasks;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  async runOnce() {
    if (this.running) return [];
    this.running = true;
    const report = [];
    try {
      for (const task of this.tasks) {
        try {
          const removed = await task.run();
          report.push({ name: task.name, removed });
          if (removed > 0) console.log(`🧹 Mantenimiento: se eliminaron ${removed} ${task.name}.`);
        } catch (err) {
          report.push({ name: task.name, error: err.message });
          console.error(`⚠️ Mantenimiento: falló la limpieza de ${task.name}:`, err.message);
        }
      }
    } finally {
      this.running = false;
    }
    return report;
  }

  start() {
    if (this.timer) return;
    console.log(`🧹 MaintenanceWorker iniciado (cada ${Math.round(this.intervalMs / 60000)} min, ${this.tasks.length} tareas).`);
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = MaintenanceWorker;
