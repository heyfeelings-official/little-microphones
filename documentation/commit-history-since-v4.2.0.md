# Historia Zmian od Wersji 4.2.0

Data: 02 Lipiec 2025
Cel: Analiza zmian w kodzie od ostatniej stabilnej wersji w celu zidentyfikowania potencjalnego źródła problemu z metadanymi Memberstack.

| Hash    | Data       | Opis Zmiany                                                                               | Autor                |
| :------ | :--------- | :---------------------------------------------------------------------------------------- | :------------------- |
| `9d314bf` | 2025-07-06 | doc: Add Memberstack troubleshooting guide                                                | heyfeelings-official |
| `85f2631` | 2025-07-06 | doc: Add detailed Memberstack integration architecture                                    | heyfeelings-official |
| `27bd610` | 2025-07-06 | Test multiple Memberstack API request formats: metadata vs metaData vs direct lmids       | heyfeelings-official |
| `1f38558` | 2025-07-06 | Fix timing issue: add 1s delay before metadata update to ensure database consistency      | heyfeelings-official |
| `312fc03` | 2025-07-06 | Add comprehensive debug logging to updateMemberstackMetadata and validateLmidOwnership    | heyfeelings-official |
| `3e5487c` | 2025-07-06 | Add testMemberstackAPI function to lm.js                                                  | heyfeelings-official |
| `25255b9` | 2025-07-06 | Add test-memberstack endpoint for debugging                                               | heyfeelings-official |
| `c192253` | 2025-07-06 | debug: add verbose logging to updateMemberstackMetadata                                   | heyfeelings-official |
| `a334fe4` | 2025-07-06 | fix: Add Memberstack metadata update to CREATE LMID action                                | heyfeelings-official |
| `1572a8f` | 2025-07-06 | **feat: Consolidate API endpoints and create shared utilities** (KLUCZOWA ZMIANA)         | heyfeelings-official |
| `5dbbc1b` | 2025-07-06 | Fix Vercel deployment limit - move audio-utils to utils folder                            | heyfeelings-official |
| `d08271d` | 2025-07-06 | Fix JavaScript variable redeclaration errors                                              | heyfeelings-official |
| `98368e3` | 2025-07-06 | Add comprehensive LMID security validation system                                         | heyfeelings-official |
| `c434d19` | 2025-07-06 | Fix LMID metadata sync with backend Memberstack Admin API                                 | heyfeelings-official |
| `02c85a0` | 2025-07-06 | Fix LMID metadata sync with Memberstack using DOM API                                     | heyfeelings-official |
| `493b27d` | 2025-07-06 | Fix Memberstack API integration for 2.0                                                   | heyfeelings-official |
| `3954b83` | 2025-07-06 | Add detailed logging to Memberstack metadata update                                       | heyfeelings-official |
| `0cbdb33` | 2025-07-06 | Complete config.js centralization                                                         | heyfeelings-official |
| `f02cc18` | 2025-07-06 | Add Memberstack API integration to LMID operations                                        | heyfeelings-official |
| `aaa4f23` | 2025-07-06 | Add documentation for config.js global configuration system                               | heyfeelings-official |
| `1df91b6` | 2025-07-06 | Implement global config.js for centralized API/CDN URLs management                        | heyfeelings-official |
| `b8e3391` | 2025-07-06 | Fix lmid-operations: Remove Memberstack API dependency, simplify backend validation     | heyfeelings-official |
| `2b91dd9` | 2025-07-06 | Refactor: Use API_BASE_URL variable for all API endpoints - better maintainability      | heyfeelings-official |
| `1c0fb48` | 2025-07-06 | Fix API URLs - use full Vercel URLs instead of relative paths                             | heyfeelings-official |
| `1e29717` | 2025-07-06 | Force Vercel redeploy - fix API endpoints                                                 | heyfeelings-official |
| `456652d` | 2025-07-06 | Complete migration from Make.com to code-based API endpoints                            | heyfeelings-official |
| `e3b7646` | 2025-07-06 | Add create-lmid endpoint with auto-generated ShareIDs for all worlds                      | heyfeelings-official |
| `239008a` | 2025-07-06 | refactor: remove old share_id column and update all APIs                                  | heyfeelings-official |
| `7b86831` | 2025-07-06 | feat: implement world-specific share_ids for unique URLs per world                        | heyfeelings-official |
| `11f1fde` | 2025-07-06 | refactor: simplify world loading via URL parameter                                        | heyfeelings-official |
| `b9dc055` | 2025-07-06 | feat: implement two-stage loading for radio page                                            | heyfeelings-official | 