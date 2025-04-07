# NHS Screening event management prototype

A prototype for managing breast screening clinics and participants, built using the [NHS.UK prototype kit](https://prototype-kit.service-manual.nhs.uk).

## About this prototype

This prototype demonstrates a system for managing breast screening clinics, including:
- Viewing and managing daily clinic lists
- Tracking participants through their screening journey
- Managing participant information and status

The prototype includes auto-generated example data to demonstrate the interactions and user journeys.

## Installation

1. Follow the [NHS.UK prototype kit installation guide](https://prototype-kit.service-manual.nhs.uk/install/simple)
2. Clone this repository
3. Run `npm install`
4. Run `npm run watch`

The prototype will generate example data on first run.

## Features

- View all clinics or today's clinics
- View clinic details and participant lists
- Track participant status through their screening journey
- View participant details within clinic context

## Development notes

- Example data is auto-generated in `app/data/generated`
- Delete the generated folder to regenerate fresh example data
- You can also run the generator directly with `node app/lib/generate-seed-data.js`
- Uses NHS.UK design system components and patterns
- Use `tree app` to generate a tree diagram of the project

## Security

As with all prototypes made with the NHS.UK prototype kit, this is for research and testing only. Do not use real participant data.

If you publish your prototypes online, they must be protected by a username and password. This is to prevent members of the public finding prototypes and thinking they are real services.
