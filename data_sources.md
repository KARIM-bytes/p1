# Data Sources

## Note on "Clinical Data"
This assessment implements a Compliance Engine for legal 
practice management — not a clinical/medical system. 
No clinical data was used or required.

The term "clinical data" in the brief appears to reference 
BRAHMO's broader healthcare context. This compliance engine 
governs AI session access control and audit logging, 
which operates independently of any clinical dataset.

## Seed Data — Fully Synthetic
All data used is synthetically generated for demo purposes only. 
No real patient, client, or legal records were used.

| Data Type | Source |
|---|---|
| User accounts (Priya, Rahul, Sonia, Partner) | Manually authored in seed.sql |
| Legal matters (Anticipatory Bail, Property Dispute, NDA Review) | Fictional, manually authored |
| Client names (Rajesh Kumar, TechCorp) | Fictional, manually authored |
| AI session records (16 sessions) | Synthetically generated for demo |
| Blocked access events (12 events) | Synthetically generated for demo |

## Tools Used
- Supabase (free tier) — database + RLS
- Next.js (open source) — frontend
- No paid datasets, no external APIs, no real-world records

## Data Privacy
Since all data is synthetic, there are zero privacy concerns. 
In a production deployment, real matter data would be 
entered by the law firm directly — BRAHMO stores and 
governs it but does not source it.
