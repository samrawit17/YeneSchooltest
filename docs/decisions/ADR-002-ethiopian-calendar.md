# ADR-002: Ethiopian Calendar Handling Strategy

**Status:** Accepted | **Date:** 2024-01-20 | **Author:** HUMAN Tech PLC

## Context
YeneSchool operates in Ethiopia where the Ethiopian calendar (13 months, ~7-8 years behind Gregorian) is the standard for academic and financial operations.

## Decision
Use `ethiopian-calendar-new` library as the primary calendar utility. Store dates in both Ethiopian and Gregorian where needed, but default to Ethiopian for:
- Academic year dates
- Term/semester dates
- Fee due dates
- Report card periods

## Rationale
- Dedicated library handles the complex 13-month system correctly
- Academic year logic (Meskerem to Sene) is calendar-aware
- Finance installments must use Ethiopian months (10 school months)
- User preference toggle between Gregorian/Ethiopian views

## Consequences
- Never use raw JavaScript `Date` math for Ethiopian date calculations
- All date inputs/outputs in forms must specify calendar context
- react-big-calendar has an Ethiopian calendar adapter
- CalendarContext provides the current calendar mode to all components

## Alternatives Considered
- **Raw Date manipulation**: Too error-prone for the 13-month system
- **Store all dates as Gregorian only**: Loses Ethiopian calendar context for fees and academic years
