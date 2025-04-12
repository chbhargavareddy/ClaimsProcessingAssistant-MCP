# Claims Processing Assistant MCP Server

This is a Model Context Protocol (MCP) server that provides claims processing capabilities through integration with a Supabase database. The server enables AI assistants to interact with insurance claim processing workflows and data through natural language.

## Features

- Claims validation and processing
- Document management and storage
- Policy rule enforcement
- Audit trail tracking
- Integration with Supabase backend

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Git

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/ClaimsProcessingAssistant-MCP.git
   cd ClaimsProcessingAssistant-MCP
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Update the following variables in `.env`:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. Build the project:
   ```bash
   npm run build
   ```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Available Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Start the production server
- `npm run dev` - Run the development server with hot-reload
- `npm run test` - Run tests
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run format` - Format code with Prettier

## Project Structure

- `src/` - Source code
- `dist/` - Compiled JavaScript code
- `tests/` - Test files
- `.env` - Environment variables
- `tsconfig.json` - TypeScript configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
