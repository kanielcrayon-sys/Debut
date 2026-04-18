"use client"
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { useSchoolInfo } from "@/app/src/context/schoolContext";

interface SchoolInfoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (trimestre?: string) => void;
  showTrimesterSelect?: boolean;
}

export default function SchoolInfoModal({ open, onClose, onConfirm, showTrimesterSelect = false }: SchoolInfoModalProps) {
  const { schoolInfo, updateSchoolInfo } = useSchoolInfo();
  const [formData, setFormData] = useState(schoolInfo);
  const [selectedTrimester, setSelectedTrimester] = useState<string>("1er trimestre");

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          logoUrl: base64
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    updateSchoolInfo(formData);
    onConfirm(selectedTrimester);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        Informations de l&apos;École
      </DialogTitle>
      <DialogContent className="dark:bg-gray-800 mt-4 flex flex-col gap-4">
        <TextField
          label="Nom de l'école"
          value={formData.schoolName}
          onChange={(e) => handleChange("schoolName", e.target.value)}
          fullWidth
          className="dark:text-white"
          InputProps={{ className: "dark:text-white" }}
        />
        <TextField
          label="Numéro de téléphone"
          value={formData.phoneNumber}
          onChange={(e) => handleChange("phoneNumber", e.target.value)}
          fullWidth
          className="dark:text-white"
          InputProps={{ className: "dark:text-white" }}
        />
        <TextField
          label="Année scolaire (ex: 2025-2026)"
          value={formData.academicYear}
          onChange={(e) => handleChange("academicYear", e.target.value)}
          fullWidth
          className="dark:text-white"
          InputProps={{ className: "dark:text-white" }}
        />

        {/* ✅ SELECT TRIMESTRE - VERSION SIMPLE */}
        {showTrimesterSelect && (
          <div className="flex flex-col gap-2">
            <label className="text-white font-semibold">Trimestre</label>
            <select
              value={selectedTrimester}
              onChange={(e) => setSelectedTrimester(e.target.value)}
              className="px-4 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1er trimestre">1er trimestre</option>
              <option value="2eme trimestre">2ème trimestre</option>
              <option value="3eme trimestre">3ème trimestre</option>
              <option value="1er semestre">1er semestre</option>
              <option value="2eme semestre">2ème semestre</option>
            </select>
          </div>
        )}

        {/* ✅ SECTION LOGO */}
        <div className="flex flex-col gap-3">
          <label className="font-semibold text-gray-900 dark:text-white">Logo de l&apos;école (optionnel)</label>
          
          {formData.logoUrl && (
            <div className="flex justify-center mb-3">
              <img 
                src={formData.logoUrl} 
                alt="Logo" 
                style={{ maxWidth: "150px", maxHeight: "150px", objectFit: "contain" }}
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
            dark:bg-gray-700 dark:text-white cursor-pointer"
          />
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez une image (PNG, JPG, etc.)
          </p>

          {formData.logoUrl && (
            <Button
              onClick={() => handleChange("logoUrl", "")}
              variant="outlined"
              color="error"
              size="small"
            >
              Supprimer le logo
            </Button>
          )}
        </div>
      </DialogContent>
      <DialogActions className="dark:bg-gray-800 px-6 py-4">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button onClick={handleConfirm} variant="contained" className="!bg-blue-600">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}