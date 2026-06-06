
# Requirements

One of the first design decisions was to ensure Docker was the underlying deployment strategy ("Dockerized on day one") so that "it just works" (thanks Todd Howard):

```sh
# BTW I use Arch (TODO: Convert to Ansible, anyone?)

# Install Docker if not already present
sudo pacman -Syu docker

# If you expect Docker to always run:
sudo systemctl enable --now docker

# Otherwise, start Docker when you need it:
# sudo systemctl start docker

# Ensure the current user is able to use Docker without sudo:
sudo usermod -aG docker $USER
```

# Database

The application makes use of SQLite, which Python supports natively. The application will [ensure the database is available](./app/database.py); however, the Docker volume needs to be created manually:

```sh
cd $pathToCloneDirectory

# While the repo currently has a .gitkeep file under data, it may not persist over time; therefore, ensure the directory is available:
mkdir -p data
```

# Running

After Docker is installed and running, a simple command can bring up the application:

```sh
docker-compose up --build
```

And the application will be available on [localhost](http://localhost), ready for all sorts of tasks that may or may not get DONE.
