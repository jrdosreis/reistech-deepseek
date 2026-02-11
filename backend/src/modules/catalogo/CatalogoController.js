const CatalogoService = require('./CatalogoService');
const { responseSuccess, responseError } = require('../../core/utils/response');
const { AppError } = require('../../core/errors/AppError');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/env');

const catalogoService = new CatalogoService();

// Configurar multer para upload de CSV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(config.upload.path, { recursive: true }, (err) => {
      if (err) {
        return cb(err);
      }
      cb(null, config.upload.path);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'catalogo-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new AppError('Apenas arquivos CSV são permitidos', 'INVALID_FILE_TYPE'));
    }
  },
  limits: { fileSize: config.upload.maxFileSize }
});

class CatalogoController {
  async import(req, res, next) {
    try {
      const uploadMiddleware = upload.single('file');
      
      uploadMiddleware(req, res, async (err) => {
        if (err) {
          return next(new AppError(err.message, 'UPLOAD_ERROR', 400));
        }

        if (!req.file) {
          return next(new AppError('Nenhum arquivo enviado', 'NO_FILE', 400));
        }

        const { workspace } = req;
        const { replace } = req.body;
        let result;

        try {
          result = await catalogoService.importCSV(workspace.id, req.file.path, replace === 'true');
        } finally {
          fs.promises.unlink(req.file.path).catch(() => null);
        }

        res.json(responseSuccess(result, 'Catálogo importado com sucesso'));
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { workspace } = req;
      const { page = 1, limit = 20 } = req.query;

      const result = await catalogoService.list(workspace.id, parseInt(page), parseInt(limit));
      res.json(responseSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  async getWhatsappText(req, res, next) {
    try {
      const { workspace } = req;
      const text = await catalogoService.getWhatsappText(workspace.id);
      res.json(responseSuccess({ text }));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { workspace } = req;
      const { id } = req.params;
      const data = req.body;

      const item = await catalogoService.update(workspace.id, id, data);
      res.json(responseSuccess(item, 'Item atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { workspace } = req;
      const { id } = req.params;

      const result = await catalogoService.delete(workspace.id, id);
      res.json(responseSuccess(result, 'Item desativado com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CatalogoController();