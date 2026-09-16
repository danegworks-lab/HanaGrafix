export class CustomerDTO {
    constructor({ id = null, name = '', tin = '', address = '', contactPerson = '', phone = '', email = '' }) {
        this.id = id;
        this.name = name.trim();
        this.tin = tin.trim();
        this.address = address.trim();
        this.contactPerson = contactPerson.trim();
        this.phone = phone.trim();
        this.email = email.trim();
    }

    // Map database snake_case to frontend camelCase
    static fromDatabase(data) {
        if (!data) return null;
        return new CustomerDTO({
            id: data.id,
            name: data.name,
            tin: data.tin || '',
            address: data.address || '',
            contactPerson: data.contact_person || '',
            phone: data.phone || '',
            email: data.email || ''
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