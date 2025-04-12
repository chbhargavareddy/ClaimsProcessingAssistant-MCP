"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const supabase_1 = require("./config/supabase");
async function handleRequest(request) { try {
    switch (request.function) {
        case "readClaims": {
            const schema = zod_1.z.object({ status: zod_1.z.enum(["pending", "approved", "rejected"]).optional(), limit: zod_1.z.number().min(1).max(100).optional(), offset: zod_1.z.number().min(0).optional() });
            const { status, limit = 10, offset = 0 } = schema.parse(request.parameters);
            const query = supabase_1.supabase.from("claims").select("*");
            if (status) {
                query.eq("status", status);
            }
            const { data, error } = await query.range(offset, offset + limit - 1);
            if (error)
                throw error;
            return { result: data };
        }
        case "createClaim": {
            const schema = zod_1.z.object({ policy_number: zod_1.z.string(), claimant_name: zod_1.z.string(), claim_type: zod_1.z.string(), claim_amount: zod_1.z.number(), status: zod_1.z.enum(["pending", "approved", "rejected"]).default("pending") });
            const claim = schema.parse(request.parameters);
            const { data, error } = await supabase_1.supabase.from("claims").insert([claim]).select();
            if (error)
                throw error;
            return { result: data[0] };
        }
        case "updateClaim": {
            const schema = zod_1.z.object({ id: zod_1.z.string(), updates: zod_1.z.object({ status: zod_1.z.enum(["pending", "approved", "rejected"]).optional(), claim_amount: zod_1.z.number().optional() }) });
            const { id, updates } = schema.parse(request.parameters);
            const { data, error } = await supabase_1.supabase.from("claims").update(updates).eq("id", id).select();
            if (error)
                throw error;
            return { result: data[0] };
        }
        case "deleteClaim": {
            const schema = zod_1.z.object({ id: zod_1.z.string() });
            const { id } = schema.parse(request.parameters);
            const { error } = await supabase_1.supabase.from("claims").delete().eq("id", id);
            if (error)
                throw error;
            return { result: { success: true } };
        }
        default: throw new Error(`Unknown function: ${request.function}`);
    }
}
catch (error) {
    return { error: { message: error instanceof Error ? error.message : "Unknown error" } };
} }
process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => { buffer += chunk; const lines = buffer.split("\n"); buffer = lines.pop() || ""; for (const line of lines) {
    try {
        const request = JSON.parse(line);
        handleRequest(request).then(response => { process.stdout.write(JSON.stringify(response) + "\n"); });
    }
    catch (error) {
        process.stdout.write(JSON.stringify({ error: { message: "Invalid request format" } }) + "\n");
    }
} });
process.stdin.on("end", () => { if (buffer) {
    try {
        const request = JSON.parse(buffer);
        handleRequest(request).then(response => { process.stdout.write(JSON.stringify(response) + "\n"); });
    }
    catch (error) {
        process.stdout.write(JSON.stringify({ error: { message: "Invalid request format" } }) + "\n");
    }
} });
