; Registers ProtopteraPDF as a PDF handler in Windows "Default apps" and "Open with".
; Tauri's APP_ASSOCIATE writes the ProgID; Windows still needs Capabilities + RegisteredApplications
; to list the app, and the user must confirm the default once (UserChoice is protected).

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\ProtopteraPDF\Capabilities" "ApplicationName" "ProtopteraPDF"
  WriteRegStr SHCTX "Software\ProtopteraPDF\Capabilities" "ApplicationDescription" "Минималистичный PDF-ридер"
  WriteRegStr SHCTX "Software\ProtopteraPDF\Capabilities\FileAssociations" ".pdf" "ProtopteraPDF.Document"
  WriteRegStr SHCTX "Software\RegisteredApplications" "ProtopteraPDF" "Software\ProtopteraPDF\Capabilities"
  WriteRegStr SHCTX "Software\Classes\.pdf\OpenWithProgids" "ProtopteraPDF.Document" ""
  WriteRegStr SHCTX "Software\Classes\Applications\protoptera-pdf.exe\SupportedTypes" ".pdf" ""
  WriteRegStr SHCTX "Software\Classes\Applications\protoptera-pdf.exe" "FriendlyAppName" "ProtopteraPDF"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ; Interactive install: open the app's page in Default apps so the user can confirm with one click.
  IfSilent +2
  ExecShell "open" "ms-settings:defaultapps?registeredAppUser=ProtopteraPDF"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegValue SHCTX "Software\RegisteredApplications" "ProtopteraPDF"
  DeleteRegKey SHCTX "Software\ProtopteraPDF\Capabilities"
  DeleteRegKey /ifempty SHCTX "Software\ProtopteraPDF"
  DeleteRegValue SHCTX "Software\Classes\.pdf\OpenWithProgids" "ProtopteraPDF.Document"
  DeleteRegKey SHCTX "Software\Classes\Applications\protoptera-pdf.exe"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
