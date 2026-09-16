export class CustomerDTO {
    constructor({
        id = null,
        name = '',
        company = '',
        tin = '',
        address = '',
        contactPerson = '',
        phone = '',
        email = '',
        totalOrders = 0,
        unpaidBalance = 0.00
    } = {}) {
        this.id = id;
        this.name = (name || '').trim();
        this.company = (company || '').trim();
        this.tin = (tin || '').trim();
        this.address = (address || '').trim();
        this.contactPerson = (contactPerson || '').trim();
        this.phone = (phone || '').trim();
        this.email = (email || '').trim();
        this.totalOrders = Number(totalOrders) || 0;
        this.unpaidBalance = Number(unpaidBalance) || 0.00;
    }

    // Map database snake_case to frontend camelCase
    static fromDatabase(data, stats = {}) {
        if (!data) return null;
        return new CustomerDTO({
            id: data.id,
            name: data.name || data.company || 'Unnamed Customer',
            company: data.company || '',
            tin: data.tin || '',
            address: data.address || '',
            contactPerson: data.contact_person || '',
            phone: data.phone || '',
            email: data.email || '',
            totalOrders: stats.totalOrders ?? data.totalOrders ?? 0,
            unpaidBalance: stats.unpaidBalance ?? data.unpaidBalance ?? 0.00
        });
    }

    // Prepare frontend camelCase payload for database snake_case
    toDatabase() {
        return {
            name: this.name,
            tin: this.tin || null,
            address: this.address || null,
            contact_person: this.contactPerson || null,
            phone: this.phone || null,
            email: this.email || null
        };
    }
}