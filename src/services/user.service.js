const UserServiceFactory = (userRepo) => {
    return {
        async me(id) {
            const user = await userRepo.getUserById(id)
            if (user) return {success:true, data:user}
            return {success:false, error:["Unknown user !"]}
        },

        async updateProfil(data) {
            const user = await userRepo.updateProfil(data)
            return user
        }
    }
}

module.exports = UserServiceFactory