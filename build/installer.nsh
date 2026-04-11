!include "MUI2.nsh"

; Custom installer script for Falcon ERP
; Adds additional functionality to the NSIS installer

; Define custom pages
!define MUI_WELCOMEPAGE_TEXT "Welcome to the Falcon ERP Setup Wizard.$\r$\n$\r$\nThis wizard will guide you through the installation of Falcon ERP, a complete Enterprise Resource Planning system.$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_TEXT "Falcon ERP has been successfully installed on your computer.$\r$\n$\r$\nClick Finish to close this wizard."

; Function to check Windows version
Function CheckWindowsVersion
  ; Get Windows version
  ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentVersion"
  
  ; Windows 7 = 6.1, Windows 8 = 6.2, Windows 8.1 = 6.3, Windows 10 = 10.0
  StrCpy $R1 $R0 3
  
  ${If} $R1 == "6.0"
    MessageBox MB_OK "Windows Vista is not supported. Please upgrade to Windows 7 or later."
    Abort
  ${ElseIf} $R1 == "5."
    MessageBox MB_OK "Windows XP and earlier are not supported. Please upgrade to Windows 7 or later."
    Abort
  ${EndIf}
FunctionEnd

; Function to run after installation
Function LaunchApp
  Exec "$INSTDIR\Falcon ERP.exe"
FunctionEnd

; Add custom logic to the installation process
!macro customInit
  Call CheckWindowsVersion
!macroend

; Add custom logic after installation
!macro customInstall
  ; Create directories for app data
  CreateDirectory "$APPDATA\Falcon ERP"
  CreateDirectory "$APPDATA\Falcon ERP\data"
  CreateDirectory "$APPDATA\Falcon ERP\images"
  CreateDirectory "$APPDATA\Falcon ERP\logs"
!macroend

; Add custom logic for uninstallation
!macro customUninstall
  ; Ask user if they want to remove app data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all application data (including local database and settings)?" IDNO SkipDataRemoval
    RMDir /r "$APPDATA\Falcon ERP"
  SkipDataRemoval:
!macroend
