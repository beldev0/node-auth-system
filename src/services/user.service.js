const UserServiceFactory = (userRepo) => {
    const formatUserInfos = (user) => {
        user['nbre_session'] ? delete user['nbre_session'] : null
        user['password'] ? delete user['password'] : null
        if (!user.profil.startsWith('https://')) {
            user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
        }
        return user
    }
    return {
        async me(id) {
            const user = await userRepo.getUserById(id)
            const formatedUser = formatUserInfos(user)
            if (user) return { success: true, data: user }
            return { success: false, error: ["Unknown user !"] }
        },

        async updateProfil(data) {
            const user = await userRepo.updateProfil(data)
            const formatUser = formatUserInfos(user)
            return formatUser
        }
    }
}

module.exports = UserServiceFactory