import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

// Прапорці для мов
const flags = {
  en: '🇬🇧',
  ua: '🇺🇦'
};

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Отримати поточну мову
  const currentLanguage = i18n.language || 'en';

  // Відкрити меню вибору мови
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Закрити меню вибору мови
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Змінити мову
  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
    handleClose();
  };

  return (
    <>
      <Button
        color="inherit"
        onClick={handleClick}
        startIcon={<LanguageIcon />}
      >
        {flags[currentLanguage]}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => changeLanguage('en')}>
          <ListItemIcon>{flags.en}</ListItemIcon>
          <ListItemText>English</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => changeLanguage('ua')}>
          <ListItemIcon>{flags.ua}</ListItemIcon>
          <ListItemText>Українська</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

