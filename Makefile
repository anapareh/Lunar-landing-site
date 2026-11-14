# Makefile del monorepo Lunar Landing Site Navigator.
# Por ahora todos los targets son marcadores: solo imprimen lo que harán.

.PHONY: setup data web-dev web-build validate

setup:
	@echo "TODO: crear venv, 'pip install -e .[dev]' en data-pipeline/ y 'npm install' en web/"

data:
	@echo "TODO: descargar kernels/DEM a data-pipeline/raw/ y generar JSON en web/public/data/"

web-dev:
	@echo "TODO: 'npm run dev' en web/"

web-build:
	@echo "TODO: 'npm run build' en web/"

validate:
	@echo "TODO: ejecutar data-pipeline/scripts/validate_horizons.py contra JPL Horizons"
